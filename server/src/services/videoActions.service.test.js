import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deleteVideo } from './videoActions.service.js';

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
