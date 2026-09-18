/**
 * YouTube Data API v3 연동을 담당하는 모듈.
 *
 * 추가 패키지(googleapis) 없이 fetch로 REST를 직접 호출한다(docs/security.md 6절:
 * 새 의존성은 필요성을 확인하고 추가 — 이 정도 호출은 googleapis 없이도 충분함).
 *
 * 이 모듈은 순수하게 YouTube API 호출만 담당하고, 저장소/세션 관련 로직은 알지 못한다
 * (그 부분은 services/playlist.service.js, store/userStore.js에서 처리).
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * YouTube Data API를 호출하는 공통 래퍼.
 * 토큰 값은 Authorization 헤더에만 사용하고 로그에 남기지 않는다 (docs/security.md 4절).
 */
async function youtubeFetch(accessToken, path, options = {}) {
  const url = `${YOUTUBE_API_BASE}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = body?.error?.message || `YouTube API 요청이 실패했습니다 (status: ${res.status})`;
    const err = new Error(message);
    err.statusCode = res.status >= 400 && res.status < 500 ? 502 : 502;
    err.youtubeStatus = res.status;
    throw err;
  }

  return body;
}

/**
 * 로그인한 사용자의 재생목록 중 제목이 정확히 일치하는 항목을 찾는다.
 * 여러 페이지에 걸쳐 있을 수 있으므로 pageToken을 따라가며 전부 순회한다.
 * @returns {Promise<{id: string, title: string} | null>}
 */
export async function findPlaylistByTitle(accessToken, title) {
  let pageToken;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      mine: 'true',
      maxResults: '50',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const page = await youtubeFetch(accessToken, `/playlists?${params.toString()}`);

    const match = (page.items || []).find((item) => item.snippet?.title === title);
    if (match) {
      return { id: match.id, title: match.snippet.title };
    }

    pageToken = page.nextPageToken;
  } while (pageToken);

  return null;
}

/**
 * 새 재생목록을 생성한다.
 * @returns {Promise<{id: string, title: string}>}
 */
export async function createPlaylist(accessToken, title, { description = '', privacyStatus = 'private' } = {}) {
  const body = {
    snippet: { title, description },
    status: { privacyStatus },
  };

  const created = await youtubeFetch(accessToken, '/playlists?part=snippet,status', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return { id: created.id, title: created.snippet?.title ?? title };
}

/**
 * 재생목록에 담긴 모든 영상 항목을 조회한다(페이지네이션 전체 순회).
 * 영상 길이(durationSeconds)는 이 응답에 포함되지 않는다 — 별도 videos.list 조회가 필요하다.
 * @returns {Promise<Array<{
 *   videoId: string,
 *   playlistItemId: string,
 *   title: string,
 *   channelName: string,
 *   thumbnailUrl: string,
 *   publishedAt: string,
 * }>>}
 */
export async function listPlaylistItems(accessToken, playlistId) {
  const items = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: '50',
    });
    if (pageToken) params.set('pageToken', pageToken);

    const page = await youtubeFetch(accessToken, `/playlistItems?${params.toString()}`);

    for (const item of page.items || []) {
      const videoId = item.snippet?.resourceId?.videoId;
      // 삭제되었거나 접근할 수 없는 항목은 videoId가 없을 수 있어 건너뛴다.
      if (!videoId) continue;

      items.push({
        videoId,
        playlistItemId: item.id,
        title: item.snippet?.title ?? '',
        channelName: item.snippet?.videoOwnerChannelTitle ?? item.snippet?.channelTitle ?? '',
        // 화질 우선순위: maxres(1280x720) > standard(640x480) > high(480x360) > medium(320x180)
        // > default(120x90). 영상마다 제공되는 최고 화질이 달라 순서대로 fallback한다.
        thumbnailUrl:
          item.snippet?.thumbnails?.maxres?.url ??
          item.snippet?.thumbnails?.standard?.url ??
          item.snippet?.thumbnails?.high?.url ??
          item.snippet?.thumbnails?.medium?.url ??
          item.snippet?.thumbnails?.default?.url ??
          '',
        publishedAt: item.snippet?.publishedAt ?? new Date().toISOString(),
      });
    }

    pageToken = page.nextPageToken;
  } while (pageToken);

  return items;
}

/**
 * ISO 8601 duration(예: "PT1H2M10S", "PT20M34S")을 초 단위로 변환한다.
 * 라이브 방송 등 재생 시간이 없는 경우 YouTube가 "P0D" 같은 값을 주는데, 이 경우 null을
 * 반환한다(재생 시간 정보 없음으로 취급).
 * @returns {number | null}
 */
export function parseIso8601Duration(duration) {
  if (!duration) return null;

  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match) return null;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * 재생목록 항목 하나를 삭제한다("안볼래요" 액션의 유튜브 쪽 반영).
 * 성공 시 YouTube API가 204(빈 본문)를 반환하는데, youtubeFetch가 이를 이미
 * `{}`로 안전하게 처리한다.
 */
export async function deletePlaylistItem(accessToken, playlistItemId) {
  await youtubeFetch(accessToken, `/playlistItems?id=${playlistItemId}`, { method: 'DELETE' });
}

/**
 * 재생목록에 영상을 새로 추가한다("나중에" 액션 — 기존 항목을 지우고 새로 추가해
 * 유튜브 쪽 "추가된 시각"(publishedAt)도 지금 시각으로 갱신되게 한다).
 * publishedAt은 서버가 부여하는 읽기 전용 값이라 API로 직접 지정할 수 없다 — 새 항목을
 * 만들어야만 "방금 추가됨" 상태가 된다.
 * @returns {Promise<{ playlistItemId: string, publishedAt: string }>}
 */
export async function addPlaylistItem(accessToken, playlistId, videoId) {
  const body = {
    snippet: {
      playlistId,
      resourceId: { kind: 'youtube#video', videoId },
    },
  };

  const created = await youtubeFetch(accessToken, '/playlistItems?part=snippet', {
    method: 'POST',
    body: JSON.stringify(body),
  });

  return {
    playlistItemId: created.id,
    publishedAt: created.snippet?.publishedAt ?? new Date().toISOString(),
  };
}

/**
 * 여러 영상의 길이(초)를 한 번에 조회한다(한 번에 최대 50개씩 배치 조회).
 * @returns {Promise<Record<string, number | null>>} videoId → durationSeconds
 */
export async function getVideoDurations(accessToken, videoIds) {
  const durations = {};

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    if (batch.length === 0) continue;

    const params = new URLSearchParams({ part: 'contentDetails', id: batch.join(',') });
    const page = await youtubeFetch(accessToken, `/videos?${params.toString()}`);

    for (const item of page.items || []) {
      durations[item.id] = parseIso8601Duration(item.contentDetails?.duration);
    }
  }

  return durations;
}
