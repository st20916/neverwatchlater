/**
 * express-session 쿠키/스토어 설정을 한곳에서 관리한다.
 * 로그아웃/만료 시 clearCookie도 여기 옵션과 동일해야 브라우저에서 sid가 실제로 지워진다.
 *
 * 세션 백엔드는 express-session 기본 MemoryStore다. 서버 재시작·다중 인스턴스에서는
 * 세션이 공유되지 않으므로, Cloudtype에서는 인스턴스(replica)를 1로 유지하는 것이 안전하다.
 */
import session from 'express-session';

import { env, isProduction } from './env.js';

export const SESSION_COOKIE_NAME = 'sid';

/** 세션 쿠키 수명(24시간). 만료되면 브라우저도 쿠키를 더 이상 보내지 않는다. */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;

/**
 * 세션 쿠키 옵션.
 * - 로컬: SameSite=Lax (localhost 동시 origin에 충분, Secure 불필요)
 * - 운영: SameSite=None + Secure — 프론트(Vercel)와 API(Cloudtype)가 서로 다른
 *   사이트일 때 credentials fetch에 sid가 포함되려면 None이 필요하다.
 *   (SameSite=Lax는 top-level 이동에만 쿠키를 보내고 cross-site XHR에는 보내지 않음)
 */
export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
};

/**
 * clearCookie용 옵션. maxAge는 넣지 않는다(만료 삭제가 아닌 즉시 삭제).
 * path/sameSite/secure/httpOnly는 설정 때와 맞춰야 삭제된다.
 */
export const sessionClearCookieOptions = {
  httpOnly: sessionCookieOptions.httpOnly,
  secure: sessionCookieOptions.secure,
  sameSite: sessionCookieOptions.sameSite,
  path: sessionCookieOptions.path,
};

export function buildSessionMiddlewareOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    secret: env.session.secret,
    resave: false,
    saveUninitialized: false,
    cookie: sessionCookieOptions,
  };
}

/** @deprecated createApp / buildSessionMiddlewareOptions 사용. 테스트 호환용 별칭. */
export const sessionMiddlewareOptions = buildSessionMiddlewareOptions();

/** express-session 미들웨어를 생성한다(기본 MemoryStore). */
export function createSessionMiddleware() {
  return session(buildSessionMiddlewareOptions());
}

/**
 * 브라우저의 세션 쿠키(sid)를 삭제한다.
 * 서버 세션 destroy만으로는 쿠키가 남을 수 있어, 로그아웃·만료 응답에서 함께 호출한다.
 */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions);
}
