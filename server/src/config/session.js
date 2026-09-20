/**
 * express-session 쿠키 설정을 한곳에서 관리한다.
 * 로그아웃/만료 시 clearCookie도 여기 옵션과 동일해야 브라우저에서 sid가 실제로 지워진다.
 */
import { env, isProduction } from './env.js';

export const SESSION_COOKIE_NAME = 'sid';

/** 세션 쿠키 수명(24시간). 만료되면 브라우저도 쿠키를 더 이상 보내지 않는다. */
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24;

export const sessionCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
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

export const sessionMiddlewareOptions = {
  name: SESSION_COOKIE_NAME,
  secret: env.session.secret,
  resave: false,
  saveUninitialized: false,
  cookie: sessionCookieOptions,
};

/**
 * 브라우저의 세션 쿠키(sid)를 삭제한다.
 * 서버 세션 destroy만으로는 쿠키가 남을 수 있어, 로그아웃·만료 응답에서 함께 호출한다.
 */
export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, sessionClearCookieOptions);
}
