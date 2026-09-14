import assert from 'node:assert/strict';
import { test } from 'node:test';

import app from '../app.js';

async function withServer(callback) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await callback(`http://localhost:${port}`);
  } finally {
    server.close();
  }
}

test('GET /api/auth/google은 Google 동의 화면으로 리다이렉트한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/google`, { redirect: 'manual' });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.startsWith('https://accounts.google.com/'));
    assert.ok(location.includes('state='));
  });
});

test('GET /api/auth/me는 로그인하지 않은 경우 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});

test('GET /api/auth/google/callback은 code/state가 없으면 오류 화면으로 리다이렉트한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/google/callback`, { redirect: 'manual' });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.includes('/oauth/error'));
    assert.ok(location.includes('reason=invalid_state'));
  });
});

test('GET /api/auth/google/callback은 Google이 에러를 전달하면 오류 화면으로 리다이렉트한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/auth/google/callback?error=access_denied`, {
      redirect: 'manual',
    });

    assert.equal(res.status, 302);
    const location = res.headers.get('location');
    assert.ok(location.includes('/oauth/error'));
    assert.ok(location.includes('reason=oauth_denied'));
  });
});
