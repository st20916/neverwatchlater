import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { createUserStore } from './userStore.js';

let tmpFile;

before(async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'userStore-test-'));
  tmpFile = path.join(tmpDir, 'users.json');
});

after(async () => {
  await fs.rm(path.dirname(tmpFile), { recursive: true, force: true });
});

test('기록이 없는 사용자를 조회하면 null을 반환한다', async () => {
  const store = createUserStore(tmpFile);

  const record = await store.getPlaylistRecord('user-1');

  assert.equal(record, null);
});

test('setPlaylistRecord로 저장한 뒤 getPlaylistRecord로 조회할 수 있다', async () => {
  const store = createUserStore(tmpFile);

  await store.setPlaylistRecord('user-1', {
    playlistId: 'PL123',
    playlistTitle: 'Neverwatchlater',
  });

  const record = await store.getPlaylistRecord('user-1');

  assert.equal(record.playlistId, 'PL123');
  assert.equal(record.playlistTitle, 'Neverwatchlater');
  assert.equal(typeof record.updatedAt, 'string');
});

test('여러 사용자의 기록을 독립적으로 저장한다', async () => {
  const store = createUserStore(tmpFile);

  await store.setPlaylistRecord('user-2', { playlistId: 'PL_A', playlistTitle: 'A' });
  await store.setPlaylistRecord('user-3', { playlistId: 'PL_B', playlistTitle: 'B' });

  const user2 = await store.getPlaylistRecord('user-2');
  const user3 = await store.getPlaylistRecord('user-3');
  const user1 = await store.getPlaylistRecord('user-1'); // 이전 테스트에서 저장된 값 유지 확인

  assert.equal(user2.playlistId, 'PL_A');
  assert.equal(user3.playlistId, 'PL_B');
  assert.equal(user1.playlistId, 'PL123');
});

test('동시에 여러 쓰기가 들어와도 모두 반영된다(직렬화)', async () => {
  const store = createUserStore(tmpFile);

  await Promise.all([
    store.setPlaylistRecord('concurrent-1', { playlistId: 'C1', playlistTitle: 'C1' }),
    store.setPlaylistRecord('concurrent-2', { playlistId: 'C2', playlistTitle: 'C2' }),
    store.setPlaylistRecord('concurrent-3', { playlistId: 'C3', playlistTitle: 'C3' }),
  ]);

  const [c1, c2, c3] = await Promise.all([
    store.getPlaylistRecord('concurrent-1'),
    store.getPlaylistRecord('concurrent-2'),
    store.getPlaylistRecord('concurrent-3'),
  ]);

  assert.equal(c1.playlistId, 'C1');
  assert.equal(c2.playlistId, 'C2');
  assert.equal(c3.playlistId, 'C3');
});
