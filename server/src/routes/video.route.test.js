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

// 실제 동기화 성공/실패 플로우는 로그인 세션과 YouTube 연동이 필요해 여기서는
// 인증 가드만 검증한다.

test('GET /api/videos는 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/videos`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});

test('POST /api/videos/sync는 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/videos/sync`, { method: 'POST' });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});

test('GET /api/videos/stream은 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/videos/stream`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});

test('DELETE /api/videos/:videoId는 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/videos/v1`, { method: 'DELETE' });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});
