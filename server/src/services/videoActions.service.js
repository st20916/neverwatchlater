/**
 * 영상 정리 액션(PRD 4) 비즈니스 로직 — 안볼래요(삭제), 보관하기/해제, 나중에.
 *
 * - 안볼래요: 유튜브 재생목록에서도 항목을 제거하고, 로컬 저장소에서도 영상 레코드를
 *   통째로 지운다 — 요약 캐시(summary)를 포함한 파생 데이터도 함께 삭제된다
 *   (docs/security.md 5절, docs/product-specs/ai-summary.md 3절).
 * - 보관하기/나중에: PRD 4.2/4.3에 따라 YouTube API를 호출하지 않고 로컬 필드만 바꾼다.
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다.
 */
import * as defaultYoutube from '../providers/youtube.js';
import { videoStore as defaultVideoStore } from '../store/videoStore.js';

/**
 * 영상 하나의 필드를 갱신하고 갱신된 레코드를 반환한다. 대상이 없으면 404를 던진다.
 */
async function updateOne(store, googleId, videoId, fields) {
  const updated = await store.updateVideoFields(googleId, videoId, fields);

  if (!updated) {
    const err = new Error('대상 영상을 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }

  return updated;
}

/**
 * @param {{ googleId: string, accessToken: string, videoId: string }} params
 * @returns {Promise<{ videos: object[] }>}
 */
export async function deleteVideo({ googleId, accessToken, videoId }, deps = {}) {
  const store = deps.videoStore ?? defaultVideoStore;
  const youtube = deps.youtube ?? defaultYoutube;

  const record = await store.getUserVideoData(googleId);
  const video = record?.videos.find((v) => v.videoId === videoId);

  if (!video) {
    const err = new Error('삭제할 영상을 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }

  try {
    await youtube.deletePlaylistItem(accessToken, video.playlistItemId);
  } catch (err) {
    // 사용자가 유튜브 앱에서 이미 직접 지운 항목(404)은 원하는 결과(재생목록에 없음)가
    // 이미 달성된 상태이므로 로컬 삭제를 계속 진행한다. 그 외 오류는 그대로 전파한다.
    if (err.youtubeStatus !== 404) throw err;
  }

  const updated = await store.removeVideo(googleId, videoId);
  return { videos: updated?.videos ?? [] };
}

/**
 * "보관하기"/"보관 해제" — D-Day 방치 판정 대상에서 빼거나 다시 넣는다.
 * PRD 4.3: 유튜브 재생목록은 건드리지 않고 서비스 내 상태만 바꾼다.
 * @param {{ googleId: string, videoId: string, isArchived: boolean }} params
 * @returns {Promise<{ video: object }>}
 */
export async function setArchived({ googleId, videoId, isArchived }, deps = {}) {
  const store = deps.videoStore ?? defaultVideoStore;
  const video = await updateOne(store, googleId, videoId, { isArchived });

  return { video };
}

/**
 * "나중에" — 저장 일자를 현재 시각으로 초기화해 D-Day 방치 카운트를 리셋한다.
 *
 * 유튜브의 재생목록 항목 "추가된 시각"(publishedAt)은 읽기 전용이라 API로 직접 바꿀 수
 * 없다. 그래서 같은 영상을 새로 추가한 뒤(publishedAt이 진짜로 지금이 되는 새 항목 생성)
 * 기존 항목을 지우는 순서로 처리한다 — 재추가를 먼저 해서, 만약 재추가가 실패해도
 * 기존 항목이 그대로 남아 재생목록에서 영상이 사라지는 일이 없게 한다. 반대로 삭제가
 * 실패하면 중복 항목이 남는데, 이는 다음 동기화 때 정리될 수 있는 안전한 실패다.
 * @param {{ googleId: string, accessToken: string, playlistId: string, videoId: string }} params
 * @returns {Promise<{ video: object }>}
 */
export async function resetSavedAt({ googleId, accessToken, playlistId, videoId }, deps = {}) {
  const store = deps.videoStore ?? defaultVideoStore;
  const youtube = deps.youtube ?? defaultYoutube;

  const record = await store.getUserVideoData(googleId);
  const existing = record?.videos.find((v) => v.videoId === videoId);

  if (!existing) {
    const err = new Error('대상 영상을 찾을 수 없습니다.');
    err.statusCode = 404;
    throw err;
  }

  const added = await youtube.addPlaylistItem(accessToken, playlistId, videoId);

  try {
    await youtube.deletePlaylistItem(accessToken, existing.playlistItemId);
  } catch (err) {
    // 이미 지워진 항목(404)이면 무시하고, 그 외 오류는 중복 항목이 남는 채로 넘어간다
    // (다음 동기화 때 정리 가능한 안전한 실패 — 영상이 사라지는 것보다 낫다).
    if (err.youtubeStatus !== 404) {
      console.warn(`videoActions: 나중에 처리 중 기존 재생목록 항목 삭제 실패(videoId=${videoId})`, err.message);
    }
  }

  const video = await updateOne(store, googleId, videoId, {
    savedAt: added.publishedAt,
    playlistItemId: added.playlistItemId,
  });

  return { video };
}
