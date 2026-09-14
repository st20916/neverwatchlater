import assert from 'node:assert/strict';
import { test } from 'node:test';

import { ensureDedicatedPlaylist, PLAYLIST_TITLE } from './playlist.service.js';

function createFakeStore(initial = {}) {
  const records = { ...initial };
  return {
    async getPlaylistRecord(googleId) {
      return records[googleId] ?? null;
    },
    async setPlaylistRecord(googleId, data) {
      records[googleId] = { ...data, updatedAt: 'fixed' };
      return records[googleId];
    },
    _records: records,
  };
}

test('이미 저장된 기록이 있으면 YouTube를 호출하지 않고 그대로 반환한다', async () => {
  const store = createFakeStore({
    'user-1': { playlistId: 'EXISTING', playlistTitle: PLAYLIST_TITLE },
  });
  const youtube = {
    findPlaylistByTitle: async () => {
      throw new Error('호출되면 안 됨');
    },
    createPlaylist: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  const result = await ensureDedicatedPlaylist(
    { googleId: 'user-1', accessToken: 'token' },
    { userStore: store, youtube }
  );

  assert.deepEqual(result, { playlistId: 'EXISTING', created: false });
});

test('저장된 기록이 없고 YouTube에 이미 존재하면 새로 만들지 않고 저장만 한다', async () => {
  const store = createFakeStore();
  let createCalled = false;
  const youtube = {
    findPlaylistByTitle: async (_token, title) => {
      assert.equal(title, PLAYLIST_TITLE);
      return { id: 'FOUND_ON_YT', title: PLAYLIST_TITLE };
    },
    createPlaylist: async () => {
      createCalled = true;
      throw new Error('호출되면 안 됨');
    },
  };

  const result = await ensureDedicatedPlaylist(
    { googleId: 'user-2', accessToken: 'token' },
    { userStore: store, youtube }
  );

  assert.deepEqual(result, { playlistId: 'FOUND_ON_YT', created: false });
  assert.equal(createCalled, false);
  assert.equal(store._records['user-2'].playlistId, 'FOUND_ON_YT');
});

test('저장된 기록도 없고 YouTube에도 없으면 새로 생성한다', async () => {
  const store = createFakeStore();
  const youtube = {
    findPlaylistByTitle: async () => null,
    createPlaylist: async (_token, title, options) => {
      assert.equal(title, PLAYLIST_TITLE);
      assert.equal(options.privacyStatus, 'private');
      return { id: 'NEW_PLAYLIST', title };
    },
  };

  const result = await ensureDedicatedPlaylist(
    { googleId: 'user-3', accessToken: 'token' },
    { userStore: store, youtube }
  );

  assert.deepEqual(result, { playlistId: 'NEW_PLAYLIST', created: true });
  assert.equal(store._records['user-3'].playlistId, 'NEW_PLAYLIST');
});
