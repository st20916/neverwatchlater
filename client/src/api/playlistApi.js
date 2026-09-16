import { API_BASE_URL } from './config';

/**
 * 전용 재생목록(Neverwatchlater)을 확보한다. 이미 있으면 기존 값을, 없으면 새로 만든 뒤
 * 그 값을 반환한다(멱등적). 로그인 세션이 필요하다.
 */
export async function setupDedicatedPlaylist() {
  const res = await fetch(`${API_BASE_URL}/api/playlists/setup`, {
    method: 'POST',
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body.message || '전용 재생목록 설정에 실패했습니다.');
    // 서버가 내려주는 reason 코드(예: 'insufficient_scope')를 그대로 전달한다.
    // 호출하는 쪽에서 이 값으로 재로그인 안내 여부를 판단한다.
    error.reason = body.reason;
    throw error;
  }

  return body; // { playlistId, created }
}

/**
 * 저장소에 기록된 현재 재생목록 상태를 조회한다(YouTube 재조회 없음). 로그인 세션이 필요하다.
 */
export async function getPlaylistStatus() {
  const res = await fetch(`${API_BASE_URL}/api/playlists/me`, {
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || '재생목록 상태를 불러오지 못했습니다.');
  }

  return body; // { playlist }
}
