import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deleteVideo, resetSavedAt, setArchived } from './videoActions.service.js';

function createFakeStore(initial) {
  const records = { ...initial };
  return {
    async getUserVideoData(googleId) {
      return records[googleId] ?? null;
    },
    async removeVideo(googleId, videoId) {
      const record = records[googleId];
      if (!record) return null;

      const nextVideos = record.videos.filter((v) => v.videoId !== videoId);
      if (nextVideos.length === record.videos.length) return null;

      records[googleId] = { ...record, videos: nextVideos };
      return records[googleId];
    },
    async updateVideoFields(googleId, videoId, fields) {
      const record = records[googleId];
      if (!record) return null;

      const index = record.videos.findIndex((v) => v.videoId === videoId);
      if (index === -1) return null;

      record.videos[index] = { ...record.videos[index], ...fields };
      return record.videos[index];
    },
    _records: records,
  };
}

test('deleteVideo는 유튜브 재생목록 항목을 지우고 로컬 저장소에서도 영상을 제거한다', async () => {
  const store = createFakeStore({
    'user-1': {
      lastSyncedAt: null,
      videos: [
        { videoId: 'v1', playlistItemId: 'pi1', title: '지울 영상' },
        { videoId: 'v2', playlistItemId: 'pi2', title: '남을 영상' },
      ],
    },
  });

  let calledWith;
  const youtube = {
    deletePlaylistItem: async (accessToken, playlistItemId) => {
      calledWith = { accessToken, playlistItemId };
    },
  };

  const result = await deleteVideo(
    { googleId: 'user-1', accessToken: 'token-1', videoId: 'v1' },
    { videoStore: store, youtube }
  );

  assert.deepEqual(calledWith, { accessToken: 'token-1', playlistItemId: 'pi1' });
  assert.deepEqual(
    result.videos.map((v) => v.videoId),
    ['v2']
  );
  assert.deepEqual(
    store._records['user-1'].videos.map((v) => v.videoId),
    ['v2']
  );
});

test('deleteVideo는 존재하지 않는 videoId면 404 에러를 던진다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', playlistItemId: 'pi1' }] },
  });
  const youtube = {
    deletePlaylistItem: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  await assert.rejects(
    () =>
      deleteVideo(
        { googleId: 'user-1', accessToken: 'token', videoId: 'nope' },
        { videoStore: store, youtube }
      ),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('deleteVideo는 유튜브에서 이미 삭제된 항목(404)이어도 로컬 삭제는 계속 진행한다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', playlistItemId: 'pi1' }] },
  });
  const youtube = {
    deletePlaylistItem: async () => {
      const err = new Error('찾을 수 없습니다.');
      err.youtubeStatus = 404;
      throw err;
    },
  };

  const result = await deleteVideo(
    { googleId: 'user-1', accessToken: 'token', videoId: 'v1' },
    { videoStore: store, youtube }
  );

  assert.deepEqual(result.videos, []);
});

test('deleteVideo는 유튜브 삭제가 404 외의 이유로 실패하면 로컬 삭제 없이 에러를 던진다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', playlistItemId: 'pi1' }] },
  });
  const youtube = {
    deletePlaylistItem: async () => {
      const err = new Error('쿼터를 초과했습니다.');
      err.youtubeStatus = 403;
      throw err;
    },
  };

  await assert.rejects(() =>
    deleteVideo(
      { googleId: 'user-1', accessToken: 'token', videoId: 'v1' },
      { videoStore: store, youtube }
    )
  );

  assert.deepEqual(
    store._records['user-1'].videos.map((v) => v.videoId),
    ['v1']
  );
});

test('setArchived는 대상 영상의 isArchived만 바꾸고 갱신된 영상을 반환한다', async () => {
  const store = createFakeStore({
    'user-1': {
      lastSyncedAt: null,
      videos: [
        { videoId: 'v1', isArchived: false, savedAt: '2026-01-01T00:00:00.000Z' },
        { videoId: 'v2', isArchived: false },
      ],
    },
  });

  const result = await setArchived(
    { googleId: 'user-1', videoId: 'v1', isArchived: true },
    { videoStore: store }
  );

  assert.equal(result.video.isArchived, true);
  // 저장 일자 등 다른 필드는 그대로 유지된다.
  assert.equal(result.video.savedAt, '2026-01-01T00:00:00.000Z');
  assert.equal(store._records['user-1'].videos[1].isArchived, false);
});

test('setArchived는 isArchived를 false로 되돌려 보관을 해제할 수 있다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', isArchived: true }] },
  });

  const result = await setArchived(
    { googleId: 'user-1', videoId: 'v1', isArchived: false },
    { videoStore: store }
  );

  assert.equal(result.video.isArchived, false);
});

test('setArchived는 존재하지 않는 영상이면 404 에러를 던진다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', isArchived: false }] },
  });

  await assert.rejects(
    () => setArchived({ googleId: 'user-1', videoId: 'nope', isArchived: true }, { videoStore: store }),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});

test('resetSavedAt은 재생목록 항목을 재추가하고, 응답의 publishedAt으로 저장 일자를 갱신한다', async () => {
  const store = createFakeStore({
    'user-1': {
      lastSyncedAt: null,
      videos: [
        {
          videoId: 'v1',
          playlistItemId: 'old-pi',
          savedAt: '2026-01-01T00:00:00.000Z',
          isArchived: false,
        },
      ],
    },
  });

  let addCalledWith;
  let deleteCalledWith;
  const youtube = {
    addPlaylistItem: async (accessToken, playlistId, videoId) => {
      addCalledWith = { accessToken, playlistId, videoId };
      return { playlistItemId: 'new-pi', publishedAt: '2026-09-18T12:34:56.000Z' };
    },
    deletePlaylistItem: async (accessToken, playlistItemId) => {
      deleteCalledWith = { accessToken, playlistItemId };
    },
  };

  const result = await resetSavedAt(
    { googleId: 'user-1', accessToken: 'token-1', playlistId: 'PL1', videoId: 'v1' },
    { videoStore: store, youtube }
  );

  assert.deepEqual(addCalledWith, { accessToken: 'token-1', playlistId: 'PL1', videoId: 'v1' });
  // 재생목록 항목 삭제는 "새로 추가된 뒤" 기존(old-pi) 항목을 대상으로 이뤄져야 한다.
  assert.deepEqual(deleteCalledWith, { accessToken: 'token-1', playlistItemId: 'old-pi' });

  assert.equal(result.video.savedAt, '2026-09-18T12:34:56.000Z');
  assert.equal(result.video.playlistItemId, 'new-pi');
  // 보관 상태 등 다른 필드는 건드리지 않는다.
  assert.equal(result.video.isArchived, false);
});

test('resetSavedAt은 기존 항목 삭제가 실패해도(중복 허용) 저장 일자 갱신은 그대로 반영한다', async () => {
  const store = createFakeStore({
    'user-1': {
      lastSyncedAt: null,
      videos: [{ videoId: 'v1', playlistItemId: 'old-pi', savedAt: '2026-01-01T00:00:00.000Z' }],
    },
  });
  const youtube = {
    addPlaylistItem: async () => ({ playlistItemId: 'new-pi', publishedAt: '2026-09-18T00:00:00.000Z' }),
    deletePlaylistItem: async () => {
      throw new Error('쿼터를 초과했습니다.');
    },
  };

  const result = await resetSavedAt(
    { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', videoId: 'v1' },
    { videoStore: store, youtube }
  );

  assert.equal(result.video.savedAt, '2026-09-18T00:00:00.000Z');
  assert.equal(result.video.playlistItemId, 'new-pi');
});

test('resetSavedAt은 존재하지 않는 영상이면 404 에러를 던지고 재생목록에 추가를 시도하지 않는다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'v1', playlistItemId: 'pi1' }] },
  });
  const youtube = {
    addPlaylistItem: async () => {
      throw new Error('호출되면 안 됨');
    },
    deletePlaylistItem: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  await assert.rejects(
    () =>
      resetSavedAt(
        { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', videoId: 'nope' },
        { videoStore: store, youtube }
      ),
    (err) => {
      assert.equal(err.statusCode, 404);
      return true;
    }
  );
});
