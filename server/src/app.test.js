import assert from 'node:assert/strict';
import { test } from 'node:test';

import app from './app.js';

async function withServer(callback) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    await callback(`http://localhost:${port}`);
  } finally {
    server.close();
  }
}

test('GET /api/health는 200과 ok 상태를 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/health`);
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.status, 'ok');
  });
});

test('정의되지 않은 라우트는 404를 반환한다', async () => {
  await withServer(async (baseUrl) => {
    const res = await fetch(`${baseUrl}/api/not-exist`);

    assert.equal(res.status, 404);
  });
});
