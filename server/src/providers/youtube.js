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
