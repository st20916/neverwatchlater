import { API_BASE_URL } from './config';

/**
 * 서버 헬스체크(GET /api/health)를 호출한다.
 */
export async function fetchHealth() {
  const res = await fetch(`${API_BASE_URL}/api/health`);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.message || '헬스체크 요청이 실패했습니다.');
  }

  return body; // { status, uptime, timestamp }
}
