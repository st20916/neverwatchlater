import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getStoredVideos, syncVideos } from './videoSync.service.js';

function createFakeStore(initial = {}) {
  const records = { ...initial };
  return {
    async getUserVideoData(googleId) {
      return records[googleId] ?? null;
    },
    async setUserVideoData(googleId, data) {
      records[googleId] = data;
      return data;
    },
    async commitUserVideoData(googleId, computeNext) {
      const current = records[googleId] ?? { lastSyncedAt: null, videos: [] };
      const next = await computeNext(current);
      records[googleId] = next;
      return next;
    },
    _records: records,
  };
}

function uniqueGoogleId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

test('저장된 기록이 없으면 YouTube를 조회해 신규 영상을 pending 상태로 저장한다', async () => {
  const store = createFakeStore();
  const youtube = {
    listPlaylistItems: async () => [
      {
        videoId: 'v1',
        playlistItemId: 'pi1',
        title: '제목1',
        channelName: '채널1',
        thumbnailUrl: 'thumb1',
        publishedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
    getVideoDurations: async () => ({ v1: 610 }),
  };
  const googleId = uniqueGoogleId('user');

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  assert.equal(result.synced, true);
  assert.equal(result.videos.length, 1);
  assert.deepEqual(result.videos[0], {
    videoId: 'v1',
    playlistItemId: 'pi1',
    title: '제목1',
    channelName: '채널1',
    thumbnailUrl: 'thumb1',
    durationSeconds: 610,
    savedAt: '2026-09-01T00:00:00.000Z',
    isArchived: false,
    summaryStatus: 'pending',
    summary: null,
  });
});

test('신규 영상만 길이를 조회하고, 이미 길이가 있는 영상은 다시 조회하지 않는다', async () => {
  const googleId = uniqueGoogleId('user');
  const oldSync = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: oldSync,
      videos: [{ videoId: 'v1', durationSeconds: 999, title: '기존 영상', savedAt: 's' }],
    },
  });
  const requestedIds = [];
  const youtube = {
    listPlaylistItems: async () => [
      { videoId: 'v1', playlistItemId: 'pi1', title: '기존 영상', channelName: 'c', thumbnailUrl: 't', publishedAt: 'p' },
      { videoId: 'v2', playlistItemId: 'pi2', title: '신규 영상', channelName: 'c', thumbnailUrl: 't', publishedAt: 'p' },
    ],
    getVideoDurations: async (_token, ids) => {
      requestedIds.push(...ids);
      return { v2: 300 };
    },
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  assert.deepEqual(requestedIds, ['v2']);
  const v1 = result.videos.find((v) => v.videoId === 'v1');
  const v2 = result.videos.find((v) => v.videoId === 'v2');
  assert.equal(v1.durationSeconds, 999);
  assert.equal(v2.durationSeconds, 300);
});

test('영상 길이 조회가 실패해도 동기화 자체는 성공하고 길이는 null로 남는다', async () => {
  const googleId = uniqueGoogleId('user');
  const youtube = {
    listPlaylistItems: async () => [
      { videoId: 'v1', playlistItemId: 'pi1', title: 't', channelName: 'c', thumbnailUrl: 't', publishedAt: 'p' },
    ],
    getVideoDurations: async () => {
      throw new Error('길이 조회 실패');
    },
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: createFakeStore(), youtube }
  );

  assert.equal(result.synced, true);
  assert.equal(result.videos[0].durationSeconds, null);
});

test('마지막 동기화 후 3일이 지나지 않았으면 YouTube를 다시 호출하지 않는다', async () => {
  const googleId = uniqueGoogleId('user');
  const recentSync = new Date(Date.now() - 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: { lastSyncedAt: recentSync, videos: [{ videoId: 'v1' }] },
  });
  const youtube = {
    listPlaylistItems: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  assert.equal(result.synced, false);
  assert.equal(result.lastSyncedAt, recentSync);
});

test('force=true면 3일 이내여도 다시 동기화한다', async () => {
  const googleId = uniqueGoogleId('user');
  const recentSync = new Date(Date.now() - 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: { lastSyncedAt: recentSync, videos: [] },
  });
  let called = false;
  const youtube = {
    listPlaylistItems: async () => {
      called = true;
      return [];
    },
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1', force: true },
    { videoStore: store, youtube }
  );

  assert.equal(called, true);
  assert.equal(result.synced, true);
});

test('기존 영상은 메타데이터만 갱신하고 savedAt/보관/요약 상태는 보존한다', async () => {
  const googleId = uniqueGoogleId('user');
  const oldSync = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: oldSync,
      videos: [
        {
          videoId: 'v1',
          playlistItemId: 'pi1-old',
          title: '옛 제목',
          channelName: '옛 채널',
          thumbnailUrl: 'old-thumb',
          durationSeconds: 120,
          savedAt: '2020-01-01T00:00:00.000Z', // "나중에" 액션으로 초기화된 값이라고 가정
          isArchived: true,
          summaryStatus: 'done',
          summary: ['a', 'b', 'c'],
        },
      ],
    },
  });
  const youtube = {
    listPlaylistItems: async () => [
      {
        videoId: 'v1',
        playlistItemId: 'pi1-new',
        title: '새 제목',
        channelName: '새 채널',
        thumbnailUrl: 'new-thumb',
        publishedAt: '2026-09-01T00:00:00.000Z', // YouTube 원래 추가일(다름)
      },
    ],
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  const video = result.videos[0];
  assert.equal(video.title, '새 제목');
  assert.equal(video.playlistItemId, 'pi1-new');
  // savedAt은 YouTube의 publishedAt으로 덮어써지지 않아야 한다.
  assert.equal(video.savedAt, '2020-01-01T00:00:00.000Z');
  assert.equal(video.isArchived, true);
  assert.equal(video.summaryStatus, 'done');
  assert.deepEqual(video.summary, ['a', 'b', 'c']);
  assert.equal(video.durationSeconds, 120);
});

test('재생목록에서 사라진 영상은 결과에서 제거된다', async () => {
  const googleId = uniqueGoogleId('user');
  const oldSync = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: oldSync,
      videos: [
        { videoId: 'v1', title: '남는 영상', durationSeconds: 10 },
        { videoId: 'v2', title: '삭제된 영상', durationSeconds: 20 },
      ],
    },
  });
  const youtube = {
    listPlaylistItems: async () => [
      {
        videoId: 'v1',
        playlistItemId: 'pi1',
        title: '남는 영상',
        channelName: 'c',
        thumbnailUrl: 't',
        publishedAt: '2026-09-01T00:00:00.000Z',
      },
    ],
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  assert.equal(result.videos.length, 1);
  assert.equal(result.videos[0].videoId, 'v1');
});

test('동시에 여러 번 요청해도 YouTube는 한 번만 호출된다(중복 실행 방지)', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore();
  let callCount = 0;
  const youtube = {
    listPlaylistItems: async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return [];
    },
  };

  const [first, second] = await Promise.all([
    syncVideos({ googleId, accessToken: 'token', playlistId: 'PL1' }, { videoStore: store, youtube }),
    syncVideos({ googleId, accessToken: 'token', playlistId: 'PL1' }, { videoStore: store, youtube }),
  ]);

  assert.equal(callCount, 1);
  assert.equal(first.lastSyncedAt, second.lastSyncedAt);
});

test('동기화 도중 백그라운드 요약이 먼저 끝나도 그 결과를 덮어쓰지 않는다', async () => {
  const googleId = uniqueGoogleId('user');
  const oldSync = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: oldSync,
      videos: [
        {
          videoId: 'v1',
          title: '영상',
          summaryStatus: 'pending',
          summary: null,
          durationSeconds: 10,
          savedAt: 's',
          isArchived: false,
        },
      ],
    },
  });
  const youtube = {
    listPlaylistItems: async () => {
      // 동기화가 YouTube를 조회하는 동안 백그라운드 요약 작업이 먼저 끝나 저장됐다고 가정한다.
      store._records[googleId].videos[0] = {
        ...store._records[googleId].videos[0],
        summaryStatus: 'done',
        summary: ['a', 'b', 'c'],
      };
      return [
        {
          videoId: 'v1',
          playlistItemId: 'pi1',
          title: '영상',
          channelName: 'c',
          thumbnailUrl: 't',
          publishedAt: 'p',
        },
      ];
    },
  };

  const result = await syncVideos(
    { googleId, accessToken: 'token', playlistId: 'PL1' },
    { videoStore: store, youtube }
  );

  const video = result.videos.find((v) => v.videoId === 'v1');
  assert.equal(video.summaryStatus, 'done');
  assert.deepEqual(video.summary, ['a', 'b', 'c']);
});

test('동기화가 실패하면 기존 데이터와 마지막 동기화 시각을 그대로 유지한다', async () => {
  const googleId = uniqueGoogleId('user');
  const oldSync = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
  const store = createFakeStore({
    [googleId]: { lastSyncedAt: oldSync, videos: [{ videoId: 'v1', title: '기존 영상' }] },
  });
  const youtube = {
    listPlaylistItems: async () => {
      throw new Error('YouTube API 오류');
    },
  };

  await assert.rejects(
    () =>
      syncVideos(
        { googleId, accessToken: 'token', playlistId: 'PL1' },
        { videoStore: store, youtube }
      ),
    /YouTube API 오류/
  );

  const stored = await getStoredVideos(googleId, { videoStore: store });
  assert.equal(stored.lastSyncedAt, oldSync);
  assert.equal(stored.videos[0].title, '기존 영상');
});
