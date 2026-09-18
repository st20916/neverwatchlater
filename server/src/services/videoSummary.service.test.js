import assert from 'node:assert/strict';
import { test } from 'node:test';

import { MAX_SUMMARY_RETRIES, processPendingSummaries } from './videoSummary.service.js';

function createFakeStore(initial) {
  const records = { ...initial };
  return {
    async getUserVideoData(googleId) {
      return records[googleId] ?? null;
    },
    async updateVideoFields(googleId, videoId, fields) {
      const record = records[googleId];
      if (!record) return null;
      const idx = record.videos.findIndex((v) => v.videoId === videoId);
      if (idx === -1) return null;
      record.videos[idx] = { ...record.videos[idx], ...fields };
      return record.videos[idx];
    },
    _records: records,
  };
}

function uniqueGoogleId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2)}`;
}

test('영상 요약에 성공하면 done 상태로 저장한다', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: { lastSyncedAt: null, videos: [{ videoId: 'v1', summaryStatus: 'pending', summary: null }] },
  });
  const gemini = { summarizeVideo: async () => ['a', 'b', 'c'] };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  const video = store._records[googleId].videos[0];
  assert.equal(video.summaryStatus, 'done');
  assert.deepEqual(video.summary, ['a', 'b', 'c']);
  assert.equal(video.summaryRetryCount, 0);
});

test('요약 생성이 실패하면 failed 상태로 저장하고 재시도 횟수를 늘린다', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: null,
      videos: [{ videoId: 'v1', summaryStatus: 'pending', summary: null, summaryRetryCount: 1 }],
    },
  });
  const gemini = {
    summarizeVideo: async () => {
      throw new Error('Gemini 오류');
    },
  };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  const video = store._records[googleId].videos[0];
  assert.equal(video.summaryStatus, 'failed');
  assert.equal(video.summaryRetryCount, 2);
});

test('재시도 한도를 넘지 않은 failed 영상은 다시 처리 대상에 포함된다', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: null,
      videos: [
        {
          videoId: 'v1',
          summaryStatus: 'failed',
          summary: null,
          summaryRetryCount: MAX_SUMMARY_RETRIES - 1,
        },
      ],
    },
  });
  const gemini = { summarizeVideo: async () => ['a', 'b', 'c'] };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  assert.equal(store._records[googleId].videos[0].summaryStatus, 'done');
});

test('재시도 한도를 넘은 failed 영상은 다시 처리하지 않는다', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: null,
      videos: [
        {
          videoId: 'v1',
          summaryStatus: 'failed',
          summary: null,
          summaryRetryCount: MAX_SUMMARY_RETRIES,
        },
      ],
    },
  });
  const gemini = {
    summarizeVideo: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  const video = store._records[googleId].videos[0];
  assert.equal(video.summaryStatus, 'failed');
  assert.equal(video.summaryRetryCount, MAX_SUMMARY_RETRIES);
});

test('done 상태 영상은 처리 대상에서 제외한다', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: {
      lastSyncedAt: null,
      videos: [{ videoId: 'v1', summaryStatus: 'done', summary: ['x', 'y', 'z'] }],
    },
  });
  const gemini = {
    summarizeVideo: async () => {
      throw new Error('호출되면 안 됨');
    },
  };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  assert.deepEqual(store._records[googleId].videos[0].summary, ['x', 'y', 'z']);
});

test('동시에 여러 번 요청해도 실제 처리는 한 번만 실행된다(중복 실행 방지)', async () => {
  const googleId = uniqueGoogleId('user');
  const store = createFakeStore({
    [googleId]: { lastSyncedAt: null, videos: [{ videoId: 'v1', summaryStatus: 'pending', summary: null }] },
  });
  let callCount = 0;
  const gemini = {
    summarizeVideo: async () => {
      callCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return ['a', 'b', 'c'];
    },
  };

  await Promise.all([
    processPendingSummaries({ googleId }, { videoStore: store, gemini }),
    processPendingSummaries({ googleId }, { videoStore: store, gemini }),
  ]);

  assert.equal(callCount, 1);
});

test('동시 처리 개수는 상한(3개)을 넘지 않는다', async () => {
  const googleId = uniqueGoogleId('user');
  const videos = Array.from({ length: 7 }, (_, i) => ({
    videoId: `v${i}`,
    summaryStatus: 'pending',
    summary: null,
  }));
  const store = createFakeStore({ [googleId]: { lastSyncedAt: null, videos } });

  let current = 0;
  let max = 0;
  const gemini = {
    summarizeVideo: async () => {
      current += 1;
      max = Math.max(max, current);
      await new Promise((resolve) => setTimeout(resolve, 5));
      current -= 1;
      return ['a', 'b', 'c'];
    },
  };

  await processPendingSummaries({ googleId }, { videoStore: store, gemini });

  assert.ok(max <= 3, `동시 처리 최대치가 3을 넘음: ${max}`);
});
