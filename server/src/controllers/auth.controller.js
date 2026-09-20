import crypto from 'node:crypto';

import { env } from '../config/env.js';
import { clearSessionCookie } from '../config/session.js';
import {
  exchangeCodeForTokens,
  getGoogleAuthUrl,
  revokeToken,
  verifyIdToken,
} from '../providers/google-oauth.js';

/**
 * GET /api/auth/google
 * 사용자를 Google 로그인 동의 화면으로 리다이렉트한다.
 * CSRF 방지를 위해 랜덤 state 값을 세션에 저장하고 콜백에서 검증한다.
 * redirect 전에 session.save로 flush해, 배포 환경에서 쿠키/스토어에 state가
 * 확실히 반영된 뒤 Google로 넘어가도록 한다.
 */
export const redirectToGoogle = (req, res, next) => {
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  req.session.save((err) => {
    if (err) return next(err);
    res.redirect(getGoogleAuthUrl(state));
  });
};

/**
 * 클라이언트의 결과 화면(`/playlist-setup`, `/oauth/error`)으로 리다이렉트하는 헬퍼.
 * OAuth 콜백은 브라우저 최상위 내비게이션이므로, 성공/실패 모두 JSON이 아니라
 * 클라이언트 화면으로 리다이렉트한다.
 */
function redirectToClient(res, path, params = {}) {
  const url = new URL(path, env.clientOrigin);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  res.redirect(url.toString());
}

/**
 * GET /api/auth/google/callback
 * 인증 코드를 토큰으로 교환하고, 사용자 정보를 세션에 저장한다.
 * 성공 시 클라이언트의 `/playlist-setup`(전용 재생목록 설정 화면)으로, 실패 시
 * `/oauth/error` 화면으로 리다이렉트한다.
 *
 * 주의(docs/security.md 4절): 토큰 값, 인증 코드는 로그/에러 응답(쿼리스트링 포함)에
 * 절대 포함하지 않는다. 실패 이유는 사전에 정의한 코드(reason)만 노출한다.
 */
export const handleGoogleCallback = async (req, res) => {
  const { code, state, error: oauthError } = req.query;

  if (oauthError) {
    return redirectToClient(res, '/oauth/error', { reason: 'oauth_denied' });
  }

  const expectedState = req.session.oauthState;
  delete req.session.oauthState;

  if (!code || !state || !expectedState || state !== expectedState) {
    return redirectToClient(res, '/oauth/error', { reason: 'invalid_state' });
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = tokens.id_token ? await verifyIdToken(tokens.id_token) : null;

    if (!profile) {
      return redirectToClient(res, '/oauth/error', { reason: 'profile_fetch_failed' });
    }

    // TODO(확정필요, docs/product-specs/auth.md 2절): 현재는 서버 메모리 세션에만
    // 토큰을 보관한다. 운영 배포 전 리프레시 토큰의 영속 저장 + 암호화 방식을 정하고
    // express-session의 MemoryStore도 프로덕션용 스토어로 교체해야 한다.
    req.session.user = {
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };
    req.session.googleTokens = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date,
      // Google 토큰 응답의 공백 구분 scope 문자열. 세션 scope 검증(assertYoutubeScope)에
      // 사용한다 — 예전에 로그인해 새 scope 동의가 없는 세션을 구분하기 위함
      // (docs/product-specs/auth.md 1절 마이그레이션 안내).
      scope: tokens.scope,
    };

    redirectToClient(res, '/playlist-setup');
  } catch (err) {
    // 토큰 교환/검증 실패의 상세 내용은 서버 로그에만 남기고, 클라이언트에는
    // 정해진 reason 코드만 전달한다 (docs/security.md 4절).
    console.error('Google OAuth 콜백 처리 실패:', err.message);
    redirectToClient(res, '/oauth/error', { reason: 'token_exchange_failed' });
  }
};

/**
 * GET /api/auth/me
 * 현재 로그인된 사용자 정보를 반환한다. 토큰 값은 절대 응답에 포함하지 않는다.
 * 세션이 없거나 만료된 경우 401과 함께 sid 쿠키도 지워 브라우저에 잔여 쿠키가 남지 않게 한다.
 */
export const getMe = (req, res) => {
  if (!req.session?.user) {
    clearSessionCookie(res);
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }

  res.status(200).json({ user: req.session.user });
};

/**
 * POST /api/auth/logout
 * Google 토큰을 폐기(best-effort)하고 세션·sid 쿠키를 함께 삭제한다.
 * (docs/security.md 3절: 로그아웃은 감사 로그로 남긴다 — 토큰 값은 남기지 않는다.)
 */
export const logout = async (req, res, next) => {
  try {
    const accessToken = req.session?.googleTokens?.accessToken;
    const userId = req.session?.user?.googleId;

    if (accessToken) {
      // 폐기가 실패해도 로그아웃 자체는 계속 진행한다(best-effort).
      await revokeToken(accessToken).catch((revokeErr) => {
        console.error('Google 토큰 폐기 실패', revokeErr.message);
      });
    }

    const finishLogout = () => {
      clearSessionCookie(res);

      if (userId) {
        console.info(`[audit] logout userId=${userId} at=${new Date().toISOString()}`);
      }

      res.status(200).json({ message: '로그아웃 되었습니다.' });
    };

    // 세션이 이미 없거나 destroy를 쓸 수 없으면 쿠키만 지우고 끝낸다.
    if (!req.session) {
      return finishLogout();
    }

    req.session.destroy((err) => {
      if (err) return next(err);
      finishLogout();
    });
  } catch (err) {
    next(err);
  }
};
