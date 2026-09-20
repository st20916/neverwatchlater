import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  sessionClearCookieOptions,
  sessionCookieOptions,
} from './session.js';

test('비운영 환경 세션 쿠키는 SameSite=Lax, Secure=false다', () => {
  // 테스트/로컬은 NODE_ENV=production이 아니므로 Lax. 운영은 None+Secure
  // (크로스 오리진 credentials fetch용) — session.js 주석 참고.
  assert.notEqual(process.env.NODE_ENV, 'production');
  assert.equal(sessionCookieOptions.sameSite, 'lax');
  assert.equal(sessionCookieOptions.secure, false);
  assert.equal(sessionCookieOptions.httpOnly, true);
});

test('clearSessionCookie는 sid 쿠키를 삭제하는 Set-Cookie를 남긴다', () => {
  const headers = [];
  const res = {
    clearCookie(name, options) {
      headers.push({ name, options });
    },
  };

  clearSessionCookie(res);

  assert.equal(headers.length, 1);
  assert.equal(headers[0].name, SESSION_COOKIE_NAME);
  assert.equal(headers[0].options.path, '/');
  assert.equal(headers[0].options.httpOnly, sessionClearCookieOptions.httpOnly);
  assert.equal(headers[0].options.sameSite, sessionClearCookieOptions.sameSite);
  assert.equal(headers[0].options.secure, sessionClearCookieOptions.secure);
  // 즉시 삭제이므로 clearCookie 옵션에는 maxAge를 넣지 않는다.
  assert.equal(headers[0].options.maxAge, undefined);
});
