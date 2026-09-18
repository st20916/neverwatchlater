/**
 * 영상 정리 액션(PRD 4) 중 "안볼래요"(삭제) 비즈니스 로직.
 *
 * 유튜브 재생목록에서도 항목을 제거하고, 로컬 저장소에서도 해당 영상 레코드를 통째로
 * 지운다 — 요약 캐시(summary)를 포함한 파생 데이터도 레코드와 함께 자연히 삭제된다
 * (docs/security.md 5절, docs/product-specs/ai-summary.md 3절: 삭제는 파생 데이터까지
 * 포함해야 한다).
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다.
 */
import * as defaultYoutube from '../providers/youtube.js';
import { videoStore as defaultVideoStore } from '../store/videoStore.js';

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
