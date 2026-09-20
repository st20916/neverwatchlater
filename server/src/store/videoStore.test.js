import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

import { createVideoStore } from './videoStore.js';

let memoryServer;
let client;
let store;

before(async () => {
  memoryServer = await MongoMemoryServer.create();
  client = new MongoClient(memoryServer.getUri());
  await client.connect();
  const collection = client.db('test').collection('videos');
  store = createVideoStore({ getCollection: () => collection });
});

after(async () => {
  await client?.close();
  await memoryServer?.stop();
});

test('기록이 없는 사용자를 조회하면 null을 반환한다', async () => {
  const record = await store.getUserVideoData('user-missing');
  assert.equal(record, null);
});

test('setUserVideoData로 저장한 뒤 getUserVideoData로 조회할 수 있다', async () => {
  const videos = [{ videoId: 'v1', title: '영상 1' }];

  await store.setUserVideoData('user-1', { lastSyncedAt: '2026-09-16T00:00:00.000Z', videos });

  const record = await store.getUserVideoData('user-1');

  assert.equal(record.lastSyncedAt, '2026-09-16T00:00:00.000Z');
  assert.deepEqual(record.videos, videos);
});

test('여러 사용자의 기록을 독립적으로 저장한다', async () => {
  await store.setUserVideoData('user-2', { lastSyncedAt: null, videos: [{ videoId: 'a' }] });
  await store.setUserVideoData('user-3', { lastSyncedAt: null, videos: [{ videoId: 'b' }] });

  const user2 = await store.getUserVideoData('user-2');
  const user3 = await store.getUserVideoData('user-3');

  assert.equal(user2.videos[0].videoId, 'a');
  assert.equal(user3.videos[0].videoId, 'b');
});

test('commitUserVideoData는 최신 상태를 읽어 계산한 뒤 저장한다', async () => {
  await store.setUserVideoData('commit-user', {
    lastSyncedAt: null,
    videos: [{ videoId: 'v1', summaryStatus: 'pending' }],
  });

  const result = await store.commitUserVideoData('commit-user', (current) => ({
    lastSyncedAt: 'now',
    videos: current.videos.map((v) => ({ ...v, title: '갱신됨' })),
  }));

  assert.equal(result.videos[0].title, '갱신됨');
  const record = await store.getUserVideoData('commit-user');
  assert.equal(record.videos[0].title, '갱신됨');
});

test('updateVideoFields는 지정한 영상 하나만 갱신하고 나머지는 그대로 둔다', async () => {
  await store.setUserVideoData('update-user', {
    lastSyncedAt: null,
    videos: [
      { videoId: 'v1', summaryStatus: 'pending', title: '영상1' },
      { videoId: 'v2', summaryStatus: 'pending', title: '영상2' },
    ],
  });

  await store.updateVideoFields('update-user', 'v1', { summaryStatus: 'done', summary: ['a', 'b', 'c'] });

  const record = await store.getUserVideoData('update-user');
  assert.equal(record.videos[0].summaryStatus, 'done');
  assert.deepEqual(record.videos[0].summary, ['a', 'b', 'c']);
  assert.equal(record.videos[1].summaryStatus, 'pending');
});

test('updateVideoFields는 존재하지 않는 영상이면 null을 반환하고 아무것도 바꾸지 않는다', async () => {
  await store.setUserVideoData('missing-user', {
    lastSyncedAt: null,
    videos: [{ videoId: 'v1', title: '영상1' }],
  });

  const result = await store.updateVideoFields('missing-user', 'not-exist', { summaryStatus: 'done' });

  assert.equal(result, null);
});

test('removeVideo는 지정한 영상만 제거하고 나머지는 그대로 둔다', async () => {
  await store.setUserVideoData('remove-user', {
    lastSyncedAt: null,
    videos: [
      { videoId: 'v1', title: '영상1' },
      { videoId: 'v2', title: '영상2' },
    ],
  });

  const result = await store.removeVideo('remove-user', 'v1');

  assert.deepEqual(
    result.videos.map((v) => v.videoId),
    ['v2']
  );
  const record = await store.getUserVideoData('remove-user');
  assert.deepEqual(
    record.videos.map((v) => v.videoId),
    ['v2']
  );
});

test('removeVideo는 존재하지 않는 영상이면 null을 반환하고 아무것도 바꾸지 않는다', async () => {
  await store.setUserVideoData('remove-missing-user', {
    lastSyncedAt: null,
    videos: [{ videoId: 'v1', title: '영상1' }],
  });

  const result = await store.removeVideo('remove-missing-user', 'not-exist');

  assert.equal(result, null);
  const record = await store.getUserVideoData('remove-missing-user');
  assert.equal(record.videos.length, 1);
});

test('동시에 여러 쓰기가 들어와도 모두 반영된다(직렬화)', async () => {
  await Promise.all([
    store.setUserVideoData('concurrent-1', { lastSyncedAt: null, videos: [{ videoId: 'c1' }] }),
    store.setUserVideoData('concurrent-2', { lastSyncedAt: null, videos: [{ videoId: 'c2' }] }),
    store.setUserVideoData('concurrent-3', { lastSyncedAt: null, videos: [{ videoId: 'c3' }] }),
  ]);

  const [c1, c2, c3] = await Promise.all([
    store.getUserVideoData('concurrent-1'),
    store.getUserVideoData('concurrent-2'),
    store.getUserVideoData('concurrent-3'),
  ]);

  assert.equal(c1.videos[0].videoId, 'c1');
  assert.equal(c2.videos[0].videoId, 'c2');
  assert.equal(c3.videos[0].videoId, 'c3');
});
