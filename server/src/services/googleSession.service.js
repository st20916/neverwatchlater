/**
 * 세션에 저장된 Google 액세스 토큰이 만료됐거나 곧 만료될 경우 갱신하는 헬퍼.
 *
 * docs/security.md 2절: "토큰 갱신은 providers/google-oauth 한 곳에서만."
 * 이 서비스는 그 규칙을 지키기 위해 실제 갱신 요청은 providers/google-oauth.js에
 * 위임하고, 세션 상태를 읽고 쓰는 역할만 담당한다.
 */
import { refreshAccessToken, YOUTUBE_SCOPE } from '../providers/google-oauth.js';

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
    // 리프레시 응답에 scope가 없으면(흔한 경우) 기존에 로그인 시 저장한 scope를 유지한다.
    scope: refreshed.scope || tokens.scope,
  };

  return req.session.googleTokens.accessToken;
}

/**
 * 세션에 저장된 토큰이 YouTube scope(YOUTUBE_SCOPE)에 동의된 상태인지 확인한다.
 *
 * `youtube` scope는 로그인 기능이 먼저 구현된 뒤 추가되었기 때문에(docs/product-specs/auth.md
 * 1절 마이그레이션 안내), 그 이전에 로그인해 만들어진 세션은 이 scope에 대한 동의가 없다.
 * 이 경우 YouTube API를 호출하면 403(Insufficient authentication scopes)이 나는데,
 * 그 전에 미리 걸러서 더 명확한 에러(재로그인 필요)로 안내한다.
 */
export function hasYoutubeScope(req) {
  const scope = req.session?.googleTokens?.scope;
  if (!scope) return false;
  return scope.split(' ').includes(YOUTUBE_SCOPE);
}

/**
 * YouTube scope가 없으면 403 에러를 던진다. `err.reason = 'insufficient_scope'`를
 * 함께 담아 클라이언트가 "다시 로그인" 안내를 보여줄 수 있게 한다.
 */
export function assertYoutubeScope(req) {
  if (hasYoutubeScope(req)) return;

  const err = new Error(
    '유튜브 재생목록 접근 권한이 없습니다. 로그아웃 후 다시 로그인해 권한 동의를 갱신해주세요.',
  );
  err.statusCode = 403;
  err.reason = 'insufficient_scope';
  throw err;
}
