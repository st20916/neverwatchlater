import assert from 'node:assert/strict';
import { test } from 'node:test';

import { YOUTUBE_SCOPE } from '../providers/google-oauth.js';
import { assertYoutubeScope, getValidAccessToken, hasYoutubeScope } from './googleSession.service.js';

test('세션이 없으면(로그인 안 됨) 401 에러를 던진다', async () => {
  const req = { session: {} };

  await assert.rejects(() => getValidAccessToken(req), (err) => {
    assert.equal(err.statusCode, 401);
    return true;
  });
});

test('만료까지 여유가 있으면 기존 access token을 그대로 반환한다', async () => {
  const req = {
    session: {
      googleTokens: {
        accessToken: 'still-valid',
        refreshToken: 'refresh-token',
        expiryDate: Date.now() + 60 * 60 * 1000, // 1시간 뒤 만료
      },
    },
  };

  const token = await getValidAccessToken(req);

  assert.equal(token, 'still-valid');
});

test('refreshToken이 없는 상태로 만료 임박이면 401 에러를 던진다', async () => {
  const req = {
    session: {
      googleTokens: {
        accessToken: 'expiring',
        refreshToken: undefined,
        expiryDate: Date.now() + 1000, // 곧 만료
      },
    },
  };

  await assert.rejects(() => getValidAccessToken(req), (err) => {
    assert.equal(err.statusCode, 401);
    return true;
  });
});

test('hasYoutubeScope는 세션에 youtube scope가 없으면 false를 반환한다', () => {
  const req = {
    session: {
      googleTokens: {
        accessToken: 'token',
        // youtube scope가 추가되기 전에 로그인한 세션을 흉내낸다.
        scope: 'openid https://www.googleapis.com/auth/userinfo.email',
      },
    },
  };

  assert.equal(hasYoutubeScope(req), false);
});

test('hasYoutubeScope는 세션에 youtube scope가 있으면 true를 반환한다', () => {
  const req = {
    session: {
      googleTokens: {
        accessToken: 'token',
        scope: `openid ${YOUTUBE_SCOPE}`,
      },
    },
  };

  assert.equal(hasYoutubeScope(req), true);
});

test('hasYoutubeScope는 scope 자체가 없으면 false를 반환한다', () => {
  const req = { session: { googleTokens: { accessToken: 'token' } } };

  assert.equal(hasYoutubeScope(req), false);
});

test('assertYoutubeScope는 youtube scope가 없으면 reason: insufficient_scope로 403을 던진다', () => {
  const req = { session: { googleTokens: { accessToken: 'token', scope: 'openid' } } };

  assert.throws(() => assertYoutubeScope(req), (err) => {
    assert.equal(err.statusCode, 403);
    assert.equal(err.reason, 'insufficient_scope');
    return true;
  });
});

test('assertYoutubeScope는 youtube scope가 있으면 에러를 던지지 않는다', () => {
  const req = {
    session: { googleTokens: { accessToken: 'token', scope: YOUTUBE_SCOPE } },
  };

  assert.doesNotThrow(() => assertYoutubeScope(req));
});
