import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  SESSION_COOKIE_NAME,
  clearSessionCookie,
  sessionClearCookieOptions,
} from './session.js';

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
