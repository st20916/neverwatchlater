/**
 * 전용 재생목록("Neverwatchlater") 확보 비즈니스 로직.
 *
 * docs/product-specs/playlist.md 정책:
 * - 재생목록 이름은 'Neverwatchlater'로 고정한다.
 * - 사용자별 동기화 대상 재생목록은 1개만 허용한다.
 * - 기본 '나중에 볼 동영상' 재생목록은 조회·수정하지 않는다.
 *
 * store/provider 의존성은 매개변수로 주입 가능하게 만들어 테스트를 쉽게 한다
 * (기본값은 실제 구현을 사용).
 */
import * as defaultYoutube from '../providers/youtube.js';
import { userStore as defaultUserStore } from '../store/userStore.js';

export const PLAYLIST_TITLE = 'Neverwatchlater';

// YouTube 채널이 없는 Google 계정으로 playlists.list(mine=true)/playlists.insert를
// 호출하면 404 "Channel not found."가 발생한다(docs/troubleshooting.md 3절 참고).
// 이 경우를 구분해 클라이언트가 "채널 만들기" 안내를 보여줄 수 있게 reason 코드를 붙인다.
function toDomainError(err) {
  const isChannelNotFound =
    err.youtubeStatus === 404 && /channel/i.test(err.message || '');

  if (isChannelNotFound) {
    const friendly = new Error(
      'YouTube 채널이 없어 재생목록을 만들 수 없습니다. 채널을 먼저 만든 뒤 다시 시도해주세요.'
    );
    friendly.statusCode = 404;
    friendly.reason = 'no_channel';
    return friendly;
  }

  return err;
}

/**
 * 로그인 사용자의 전용 재생목록을 확보한다(멱등적).
 * 1. 저장소에 이미 기록이 있으면 그대로 반환.
 * 2. 없으면 YouTube에서 동일 이름의 재생목록을 찾는다.
 * 3. 그래도 없으면 새로 생성한다.
 * 4. 결과를 저장소에 기록한다.
 *
 * @param {{ googleId: string, accessToken: string }} params
 * @param {{ userStore?: typeof defaultUserStore, youtube?: typeof defaultYoutube }} deps
 * @returns {Promise<{ playlistId: string, created: boolean }>}
 */
export async function ensureDedicatedPlaylist(
  { googleId, accessToken },
  deps = {}
) {
  const store = deps.userStore ?? defaultUserStore;
  const youtube = deps.youtube ?? defaultYoutube;

  const existing = await store.getPlaylistRecord(googleId);
  if (existing?.playlistId) {
    return { playlistId: existing.playlistId, created: false };
  }

  let found;
  try {
    found = await youtube.findPlaylistByTitle(accessToken, PLAYLIST_TITLE);
  } catch (err) {
    throw toDomainError(err);
  }

  if (found) {
    await store.setPlaylistRecord(googleId, {
      playlistId: found.id,
      playlistTitle: found.title,
    });
    return { playlistId: found.id, created: false };
  }

  let created;
  try {
    created = await youtube.createPlaylist(accessToken, PLAYLIST_TITLE, {
      description: 'Neverwatchlater 전용 재생목록 (자동 생성됨)',
      privacyStatus: 'private',
    });
  } catch (err) {
    throw toDomainError(err);
  }

  await store.setPlaylistRecord(googleId, {
    playlistId: created.id,
    playlistTitle: created.title,
  });

  return { playlistId: created.id, created: true };
}

/**
 * 저장소에 기록된 현재 재생목록 상태를 조회한다(YouTube 재조회 없음).
 * @returns {Promise<{ playlistId: string, playlistTitle: string, updatedAt: string } | null>}
 */
export async function getPlaylistStatus(googleId, deps = {}) {
  const store = deps.userStore ?? defaultUserStore;
  return store.getPlaylistRecord(googleId);
}
