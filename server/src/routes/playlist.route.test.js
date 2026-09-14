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

// 전체 성공 플로우(실제 YouTube 재생목록 생성)는 실 Google 계정과 로그인 세션이 필요해
// 자동화 테스트로 재현하기 어렵다. 여기서는 인증 가드가 올바르게 동작하는지만 검증하고,
// 전체 플로우는 docs/product-specs/playlist.md의 수동 테스트 절차를 따른다.

test('POST /api/playlists/setup은 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/playlists/setup`, { method: 'POST' });
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});

test('GET /api/playlists/me는 로그인하지 않으면 401을 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/playlists/me`);
    const data = await res.json();

    assert.equal(res.status, 401);
    assert.equal(data.message, '로그인이 필요합니다.');
  });
});
