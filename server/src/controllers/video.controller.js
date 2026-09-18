import { assertYoutubeScope, getValidAccessToken } from '../services/googleSession.service.js';
import { getPlaylistStatus } from '../services/playlist.service.js';
import { getStoredVideos, syncVideos } from '../services/videoSync.service.js';
import { processPendingSummaries } from '../services/videoSummary.service.js';
import { deleteVideo as deleteVideoAction } from '../services/videoActions.service.js';
import { subscribe } from '../services/summaryEvents.js';

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
 * Gemini 호출은 사용자의 Google 액세스 토큰이 필요 없어(서버 자체 Gemini 키로 유튜브
 * URL을 직접 분석) googleId만으로 실행할 수 있다.
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

/**
 * GET /api/videos/stream
 * 백그라운드 AI 요약이 영상 하나씩 끝날 때마다 실시간으로 전달하는 SSE 스트림.
 * 클라이언트는 이 이벤트를 받아 새로고침 없이 해당 카드만 갱신한다.
 */
export const streamSummaries = (req, res) => {
  const googleId = req.session.user.googleId;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders?.();

  const send = (payload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const unsubscribe = subscribe(googleId, send);

  // 프록시/브라우저가 유휴 연결을 끊지 않도록 주기적으로 코멘트 라인을 보낸다.
  const keepAlive = setInterval(() => res.write(':ping\n\n'), 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    unsubscribe();
  });
};

/**
 * DELETE /api/videos/:videoId
 * "안볼래요" — 유튜브 재생목록과 로컬 저장소 양쪽에서 영상을 제거한다.
 */
export const deleteVideo = async (req, res, next) => {
  try {
    const googleId = req.session.user.googleId;

    assertYoutubeScope(req);
    const accessToken = await getValidAccessToken(req);

    const result = await deleteVideoAction({
      googleId,
      accessToken,
      videoId: req.params.videoId,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
