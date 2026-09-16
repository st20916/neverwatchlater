/**
 * Google OAuth 2.0 연동을 담당하는 단일 모듈.
 *
 * docs/security.md 2절 규칙:
 *   "토큰 갱신은 providers/google-oauth 한 곳에서만. 도메인 코드는 갱신 로직을 알지 못한다."
 *
 * - 인증 코드 교환(exchangeCodeForTokens), 토큰 갱신(refreshAccessToken), 토큰 폐기
 *   (revokeToken)는 반드시 이 모듈을 통해서만 수행한다.
 * - 클라이언트 시크릿은 이 모듈(서버) 안에서만 사용되고 브라우저로 절대 전달되지 않는다.
 * - 요청 scope는 docs/product-specs/auth.md에 문서화된 최소 범위만 사용한다.
 */
import { OAuth2Client } from 'google-auth-library';

import { env } from '../config/env.js';

// 전용 재생목록(Neverwatchlater) 조회/생성/관리를 위해 필요한 scope.
// docs/product-specs/playlist.md 참고. services/googleSession.service.js의
// 세션 scope 검증에서도 이 값을 그대로 사용한다.
export const YOUTUBE_SCOPE = 'https://www.googleapis.com/auth/youtube';

// docs/product-specs/auth.md 1절에 기록된 최소 scope.
// 추가/변경 시 해당 문서에 이유를 함께 남긴다.
export const GOOGLE_OAUTH_SCOPES = [
  'openid',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  YOUTUBE_SCOPE,
];

function createClient() {
  return new OAuth2Client({
    clientId: env.google.clientId,
    clientSecret: env.google.clientSecret,
    redirectUri: env.google.redirectUri,
  });
}

/**
 * 사용자를 Google 로그인 동의 화면으로 보낼 URL을 생성한다.
 * @param {string} state - CSRF 방지를 위해 세션에 저장하고 콜백에서 대조할 랜덤 값.
 */
export function getGoogleAuthUrl(state) {
  const client = createClient();

  return client.generateAuthUrl({
    access_type: 'offline', // refresh_token을 받기 위해 필요
    prompt: 'consent',
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

/**
 * 인증 코드(authorization code)를 액세스/리프레시 토큰으로 교환한다.
 * 이 교환은 반드시 서버에서만 수행한다 (docs/security.md 2절).
 */
export async function exchangeCodeForTokens(code) {
  const client = createClient();
  const { tokens } = await client.getToken(code);
  return tokens; // { access_token, refresh_token, expiry_date, id_token, ... }
}

/**
 * id_token을 검증하고 사용자 프로필(sub, email, name 등)을 반환한다.
 */
export async function verifyIdToken(idToken) {
  const client = createClient();
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.google.clientId,
  });
  return ticket.getPayload();
}

/**
 * 리프레시 토큰으로 새 액세스 토큰을 발급한다.
 * 도메인 코드는 이 함수를 통해서만 토큰을 갱신해야 한다.
 */
export async function refreshAccessToken(refreshToken) {
  const client = createClient();
  client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await client.refreshAccessToken();
  return credentials;
}

/**
 * 토큰을 폐기한다(연동 해제 시 호출). 실패해도 로그아웃 자체는 막지 않도록
 * 호출하는 쪽에서 best-effort로 처리하는 것을 권장한다.
 */
export async function revokeToken(token) {
  if (!token) return;
  const client = createClient();
  await client.revokeToken(token);
}
