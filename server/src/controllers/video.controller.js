import { getValidAccessToken } from '../services/googleSession.service.js';
import { getPlaylistStatus } from '../services/playlist.service.js';
import { getStoredVideos, syncVideos } from '../services/videoSync.service.js';
import { processPendingSummaries } from '../services/videoSummary.service.js';

async function resolvePlaylistId(googleId) {
  const record = await getPlaylistStatus(googleId);

  if (!record?.playlistId) {
    const err = new Error('전용 재생목록이 설정되지 않았습니다. 먼저 재생목록을 설정해주세요.');
    err.statusCode = 409;
    throw err;
  }

  return record.playlistId;
}

/**
 * 응답을 기다리게 하지 않고(fire-and-forget) 백그라운드에서 요약 처리를 시작한다.
 * 자막 조회/Gemini 호출은 사용자의 Google 액세스 토큰이 필요 없어(공개 자막 + 서버 자체
 * Gemini 키 사용) googleId만으로 실행할 수 있다.
 */
function triggerBackgroundSummaries(googleId) {
  processPendingSummaries({ googleId }).catch((err) => {
    console.warn('videoSummary: 백그라운드 요약 처리 중 오류', err.message);
  });
}

/**
 * force가 아닌 일반 조회/동기화 요청 처리.
 * 동기화가 실패해도 500을 던지지 않고, 기존에 저장된 목록을 syncFailed 플래그와 함께
 * 200으로 반환한다(PRD 2.1: 실패해도 기존 카드는 유지).
 */
async function handleSync(req, res, next, { force }) {
  try {
    const googleId = req.session.user.googleId;
    const accessToken = await getValidAccessToken(req);
    const playlistId = await resolvePlaylistId(googleId);

    try {
      const result = await syncVideos({ googleId, accessToken, playlistId, force });
      res.status(200).json({ ...result, syncFailed: false });
      triggerBackgroundSummaries(googleId);
    } catch {
      const fallback = await getStoredVideos(googleId);
      res.status(200).json({
        videos: fallback.videos,
        lastSyncedAt: fallback.lastSyncedAt,
        synced: false,
        syncFailed: true,
      });
      // 이번 동기화는 실패했지만, 이전에 저장된 영상 중 요약이 아직 안 끝난 것이 있을 수
      // 있으니 백그라운드 요약 처리는 그대로 시도한다.
      triggerBackgroundSummaries(googleId);
    }
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/videos
 * 마지막 동기화 후 3일이 지났으면 자동으로 동기화하고, 아니면 저장된 목록을 반환한다.
 */
export const listVideos = (req, res, next) => handleSync(req, res, next, { force: false });

/**
 * POST /api/videos/sync
 * 사용자가 "지금 동기화" 버튼을 눌렀을 때 3일 주기와 상관없이 즉시 동기화한다.
 */
export const syncVideosNow = (req, res, next) => handleSync(req, res, next, { force: true });
