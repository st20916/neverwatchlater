import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getValidAccessToken } from './googleSession.service.js';

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
