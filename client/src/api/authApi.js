import { API_BASE_URL } from './config';

/**
 * Google 로그인을 시작하는 서버 엔드포인트 URL.
 * fetch가 아니라 전체 페이지 이동(window.location)으로 열어야 한다
 * (OAuth 동의 화면은 top-level navigation이 필요함).
 */
export function getGoogleLoginUrl() {
  return `${API_BASE_URL}/api/auth/google`;
}

/**
 * 현재 로그인된 사용자 정보를 조회한다.
 * 세션 쿠키를 함께 보내야 하므로 credentials: 'include'가 필요하다.
 */
export async function fetchCurrentUser() {
  const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || '사용자 정보를 불러오지 못했습니다.');
  }

  return body; // { user }
}

/**
 * 로그아웃한다(서버 세션 삭제 + Google 토큰 폐기 best-effort).
 */
export async function logout() {
  const res = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || '로그아웃에 실패했습니다.');
  }

  return body; // { message }
}
