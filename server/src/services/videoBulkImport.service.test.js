import assert from 'node:assert/strict';
import { test } from 'node:test';

import { bulkImportVideos, MAX_URLS_PER_REQUEST } from './videoBulkImport.service.js';

function createFakeStore(initial = {}) {
  const records = { ...initial };
  return {
    async getUserVideoData(googleId) {
      return records[googleId] ?? null;
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

function createFakeYoutube({ failIds = new Set() } = {}) {
  const calls = [];
  return {
    calls,
    async addPlaylistItem(accessToken, playlistId, videoId) {
      calls.push({ accessToken, playlistId, videoId });
      if (failIds.has(videoId)) {
        throw new Error('쿼터를 초과했습니다.');
      }
      return { playlistItemId: `pi-${videoId}`, publishedAt: '2026-09-19T00:00:00.000Z' };
    },
  };
}

test('bulkImportVideos는 유효한 URL을 등록하고 재생목록/일반 URL은 무효 처리한다', async () => {
  const store = createFakeStore({ 'user-1': { lastSyncedAt: null, videos: [] } });
  const youtube = createFakeYoutube();

  const text = [
    'https://www.youtube.com/watch?v=aaaaaaaaaaa',
    'https://youtu.be/bbbbbbbbbbb',
    'https://www.youtube.com/playlist?list=PL123456789',
    'https://example.com/not-a-video',
  ].join('\n');

  const result = await bulkImportVideos(
    { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', text },
    { videoStore: store, youtube }
  );

  assert.equal(result.total, 4);
  assert.equal(result.successCount, 2);
  assert.equal(result.invalidCount, 2);
  assert.equal(result.duplicateCount, 0);
  assert.equal(result.failedCount, 0);

  assert.deepEqual(
    result.results.map((r) => r.status),
    ['success', 'success', 'invalid', 'invalid']
  );

  assert.deepEqual(
    store._records['user-1'].videos.map((v) => v.videoId).sort(),
    ['aaaaaaaaaaa', 'bbbbbbbbbbb']
  );
});

test('bulkImportVideos는 요청 내 중복 videoId와 이미 등록된 videoId를 건너뛴다', async () => {
  const store = createFakeStore({
    'user-1': { lastSyncedAt: null, videos: [{ videoId: 'existing001', playlistItemId: 'pi0' }] },
  });
  const youtube = createFakeYoutube();

  const text = [
    'https://youtu.be/existing001', // 이미 등록됨
    'https://youtu.be/newvideo001',
    'https://www.youtube.com/watch?v=newvideo001', // 요청 내 중복(같은 videoId)
  ].join('\n');

  const result = await bulkImportVideos(
    { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', text },
    { videoStore: store, youtube }
  );

  assert.equal(result.successCount, 1);
  assert.equal(result.duplicateCount, 2);
  assert.deepEqual(youtube.calls.map((c) => c.videoId), ['newvideo001']);
});

test('bulkImportVideos는 일부 등록이 실패해도 나머지 성공 건은 그대로 반영한다', async () => {
  const store = createFakeStore({ 'user-1': { lastSyncedAt: null, videos: [] } });
  const youtube = createFakeYoutube({ failIds: new Set(['failvideo01']) });

  const text = 'https://youtu.be/okvideo0001\nhttps://youtu.be/failvideo01';

  const result = await bulkImportVideos(
    { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', text },
    { videoStore: store, youtube }
  );

  assert.equal(result.successCount, 1);
  assert.equal(result.failedCount, 1);
  assert.deepEqual(
    store._records['user-1'].videos.map((v) => v.videoId),
    ['okvideo0001']
  );
});

test('bulkImportVideos는 유효한 URL이 하나도 없으면 400 에러를 던진다', async () => {
  const store = createFakeStore({ 'user-1': { lastSyncedAt: null, videos: [] } });
  const youtube = createFakeYoutube();

  await assert.rejects(
    () =>
      bulkImportVideos(
        { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', text: 'https://example.com/foo' },
        { videoStore: store, youtube }
      ),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );
});

test(`bulkImportVideos는 유효한 URL이 ${MAX_URLS_PER_REQUEST}개를 초과하면 400 에러를 던지고 아무것도 등록하지 않는다`, async () => {
  const store = createFakeStore({ 'user-1': { lastSyncedAt: null, videos: [] } });
  const youtube = createFakeYoutube();

  const text = Array.from(
    { length: MAX_URLS_PER_REQUEST + 1 },
    (_, i) => `https://youtu.be/vid${String(i).padStart(8, '0')}`
  ).join('\n');

  await assert.rejects(
    () =>
      bulkImportVideos(
        { googleId: 'user-1', accessToken: 'token', playlistId: 'PL1', text },
        { videoStore: store, youtube }
      ),
    (err) => {
      assert.equal(err.statusCode, 400);
      return true;
    }
  );

  assert.equal(youtube.calls.length, 0);
});
