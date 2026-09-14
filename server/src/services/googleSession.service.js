/**
 * 세션에 저장된 Google 액세스 토큰이 만료됐거나 곧 만료될 경우 갱신하는 헬퍼.
 *
 * docs/security.md 2절: "토큰 갱신은 providers/google-oauth 한 곳에서만."
 * 이 서비스는 그 규칙을 지키기 위해 실제 갱신 요청은 providers/google-oauth.js에
 * 위임하고, 세션 상태를 읽고 쓰는 역할만 담당한다.
 */
import { refreshAccessToken } from '../providers/google-oauth.js';

// 만료 5분 전부터는 미리 갱신한다(요청 처리 도중 만료되는 것을 방지).
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * 세션에 유효한 Google 액세스 토큰을 보장하고 반환한다.
 * 필요하면 리프레시 토큰으로 갱신하고, 갱신된 값을 세션에 다시 저장한다.
 *
 * @param {import('express').Request} req
 * @returns {Promise<string>} 유효한 access token
 */
export async function getValidAccessToken(req) {
  const tokens = req.session?.googleTokens;

  if (!tokens?.accessToken) {
    const err = new Error('Google 로그인이 필요합니다.');
    err.statusCode = 401;
    throw err;
  }

  const isExpiringSoon =
    typeof tokens.expiryDate === 'number' && tokens.expiryDate - Date.now() < EXPIRY_BUFFER_MS;

  if (!isExpiringSoon) {
    return tokens.accessToken;
  }

  if (!tokens.refreshToken) {
    const err = new Error('토큰이 만료되었고 갱신할 수 없습니다. 다시 로그인해주세요.');
    err.statusCode = 401;
    throw err;
  }

  const refreshed = await refreshAccessToken(tokens.refreshToken);

  req.session.googleTokens = {
    accessToken: refreshed.access_token,
    // Google이 새 refresh_token을 내려주지 않는 경우가 많으므로 기존 값을 유지한다.
    refreshToken: refreshed.refresh_token || tokens.refreshToken,
    expiryDate: refreshed.expiry_date,
  };

  return req.session.googleTokens.accessToken;
}
