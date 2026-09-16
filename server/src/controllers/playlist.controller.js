import { assertYoutubeScope, getValidAccessToken } from '../services/googleSession.service.js';
import { ensureDedicatedPlaylist, getPlaylistStatus } from '../services/playlist.service.js';

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
