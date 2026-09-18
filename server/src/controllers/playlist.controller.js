import { assertYoutubeScope, getValidAccessToken } from '../services/googleSession.service.js';
import { ensureDedicatedPlaylist, getPlaylistStatus } from '../services/playlist.service.js';
import { syncVideos } from '../services/videoSync.service.js';
import { processPendingSummaries } from '../services/videoSummary.service.js';

/**
 * 로그인(재로그인 포함) 직후 재생목록 설정이 끝날 때마다 실행된다. 신규 유저는 이 시점에
 * 저장된 동기화 기록이 없어 자연히 최신 상태가 되지만, 기존 유저는 마지막 동기화가 3일
 * 이내면 GET /api/videos가 캐시된 목록만 반환해 재로그인해도 최신 상태가 아닐 수 있다.
 * 그래서 여기서 3일 주기와 무관하게(force: true) 동기화를 걸어, 새로 로그인할 때마다
 * 재생목록 최신 상태를 반영하도록 한다. 응답은 기다리지 않는다(fire-and-forget) —
 * 재생목록 설정 화면은 동기화 완료를 기다릴 필요가 없고, 실제 목록은 /videos 진입 시
 * 다시 조회된다.
 */
function triggerBackgroundVideoSync(googleId, accessToken, playlistId) {
  syncVideos({ googleId, accessToken, playlistId, force: true })
    .then(() => processPendingSummaries({ googleId }))
    .catch((err) => {
      console.warn('playlist: 로그인 후 백그라운드 동기화 실패', err.message);
    });
}

/**
 * POST /api/playlists/setup
 * 로그인 사용자의 전용 재생목록(Neverwatchlater)을 확보한다(멱등적).
 * 이미 설정되어 있으면 새로 만들지 않고 기존 값을 반환한다.
 */
export const setupPlaylist = async (req, res, next) => {
  try {
    const googleId = req.session.user.googleId;

    // YouTube scope 동의가 없는 세션(예: scope 추가 이전에 로그인한 세션)이면
    // YouTube API 호출 전에 걸러서 명확한 재로그인 안내로 응답한다.
    assertYoutubeScope(req);

    const accessToken = await getValidAccessToken(req);

    const result = await ensureDedicatedPlaylist({ googleId, accessToken });

    res.status(200).json(result);
    triggerBackgroundVideoSync(googleId, accessToken, result.playlistId);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/playlists/me
 * 저장소에 기록된 현재 재생목록 상태를 조회한다(YouTube 재조회 없음).
 */
export const getMyPlaylistStatus = async (req, res, next) => {
  try {
    const googleId = req.session.user.googleId;
    const record = await getPlaylistStatus(googleId);

    res.status(200).json({ playlist: record });
  } catch (err) {
    next(err);
  }
};
