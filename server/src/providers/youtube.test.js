import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import {
  createPlaylist,
  findPlaylistByTitle,
  getVideoDurations,
  listPlaylistItems,
  parseIso8601Duration,
} from './youtube.js';

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('findPlaylistByTitle은 첫 페이지에서 일치하는 재생목록을 찾으면 반환한다', async () => {
  const calls = [];
  globalThis.fetch = mock.fn(async (url) => {
    calls.push(url);
    return jsonResponse(200, {
      items: [
        { id: 'p1', snippet: { title: 'Watch Later' } },
        { id: 'p2', snippet: { title: 'Neverwatchlater' } },
      ],
      nextPageToken: undefined,
    });
  });

  const result = await findPlaylistByTitle('token', 'Neverwatchlater');

  assert.deepEqual(result, { id: 'p2', title: 'Neverwatchlater' });
  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('mine=true'));
});

test('findPlaylistByTitle은 여러 페이지를 순회하며 찾는다', async () => {
  let call = 0;
  globalThis.fetch = mock.fn(async () => {
    call += 1;
    if (call === 1) {
      return jsonResponse(200, {
        items: [{ id: 'p1', snippet: { title: '다른 재생목록' } }],
        nextPageToken: 'page2',
      });
    }
    return jsonResponse(200, {
      items: [{ id: 'p2', snippet: { title: 'Neverwatchlater' } }],
    });
  });

  const result = await findPlaylistByTitle('token', 'Neverwatchlater');

  assert.deepEqual(result, { id: 'p2', title: 'Neverwatchlater' });
  assert.equal(call, 2);
});

test('findPlaylistByTitle은 일치하는 항목이 없으면 null을 반환한다', async () => {
  globalThis.fetch = mock.fn(async () =>
    jsonResponse(200, { items: [{ id: 'p1', snippet: { title: '다른 이름' } }] })
  );

  const result = await findPlaylistByTitle('token', 'Neverwatchlater');

  assert.equal(result, null);
});

test('createPlaylist은 POST로 재생목록을 생성하고 결과를 반환한다', async () => {
  let capturedBody;
  let capturedMethod;
  globalThis.fetch = mock.fn(async (url, options) => {
    capturedMethod = options.method;
    capturedBody = JSON.parse(options.body);
    return jsonResponse(200, { id: 'new-playlist-id', snippet: { title: 'Neverwatchlater' } });
  });

  const result = await createPlaylist('token', 'Neverwatchlater', { privacyStatus: 'private' });

  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedBody.snippet.title, 'Neverwatchlater');
  assert.equal(capturedBody.status.privacyStatus, 'private');
  assert.deepEqual(result, { id: 'new-playlist-id', title: 'Neverwatchlater' });
});

test('YouTube API가 오류 응답을 주면 에러를 던진다', async () => {
  globalThis.fetch = mock.fn(async () =>
    jsonResponse(403, { error: { message: '권한이 없습니다.' } })
  );

  await assert.rejects(() => findPlaylistByTitle('token', 'Neverwatchlater'), /권한이 없습니다/);
});

test('listPlaylistItems는 여러 페이지를 순회하며 항목을 videoId 기준으로 정리한다', async () => {
  let call = 0;
  const calls = [];
  globalThis.fetch = mock.fn(async (url) => {
    calls.push(url);
    call += 1;
    if (call === 1) {
      return jsonResponse(200, {
        items: [
          {
            id: 'playlistItem-1',
            snippet: {
              resourceId: { videoId: 'video-1' },
              title: '영상 1',
              videoOwnerChannelTitle: '채널 1',
              thumbnails: { medium: { url: 'https://thumb/1.jpg' } },
              publishedAt: '2026-09-01T00:00:00.000Z',
            },
          },
        ],
        nextPageToken: 'page2',
      });
    }
    return jsonResponse(200, {
      items: [
        {
          id: 'playlistItem-2',
          snippet: {
            resourceId: { videoId: 'video-2' },
            title: '영상 2',
            channelTitle: '재생목록 소유자 채널',
            thumbnails: { default: { url: 'https://thumb/2.jpg' } },
            publishedAt: '2026-09-02T00:00:00.000Z',
          },
        },
      ],
    });
  });

  const result = await listPlaylistItems('token', 'PLxxx');

  assert.equal(call, 2);
  assert.ok(calls[0].includes('playlistId=PLxxx'));
  assert.deepEqual(result, [
    {
      videoId: 'video-1',
      playlistItemId: 'playlistItem-1',
      title: '영상 1',
      channelName: '채널 1',
      thumbnailUrl: 'https://thumb/1.jpg',
      publishedAt: '2026-09-01T00:00:00.000Z',
    },
    {
      videoId: 'video-2',
      playlistItemId: 'playlistItem-2',
      title: '영상 2',
      channelName: '재생목록 소유자 채널',
      thumbnailUrl: 'https://thumb/2.jpg',
      publishedAt: '2026-09-02T00:00:00.000Z',
    },
  ]);
});

test('listPlaylistItems는 videoId가 없는 항목(삭제/비공개)을 건너뛴다', async () => {
  globalThis.fetch = mock.fn(async () =>
    jsonResponse(200, {
      items: [{ id: 'playlistItem-3', snippet: { resourceId: {} } }],
    })
  );

  const result = await listPlaylistItems('token', 'PLxxx');

  assert.deepEqual(result, []);
});

test('parseIso8601Duration은 시/분/초를 초 단위로 변환한다', () => {
  assert.equal(parseIso8601Duration('PT1H2M10S'), 3730);
  assert.equal(parseIso8601Duration('PT20M34S'), 1234);
  assert.equal(parseIso8601Duration('PT45S'), 45);
  assert.equal(parseIso8601Duration('PT1H'), 3600);
});

test('parseIso8601Duration은 재생 시간 정보가 없으면(라이브 방송 등) null을 반환한다', () => {
  assert.equal(parseIso8601Duration('P0D'), null);
  assert.equal(parseIso8601Duration(''), null);
  assert.equal(parseIso8601Duration(undefined), null);
});

test('getVideoDurations는 여러 영상의 길이를 한 번에 조회한다', async () => {
  const calls = [];
  globalThis.fetch = mock.fn(async (url) => {
    calls.push(url);
    return jsonResponse(200, {
      items: [
        { id: 'v1', contentDetails: { duration: 'PT10M0S' } },
        { id: 'v2', contentDetails: { duration: 'PT1H0M0S' } },
      ],
    });
  });

  const result = await getVideoDurations('token', ['v1', 'v2']);

  assert.equal(calls.length, 1);
  assert.ok(calls[0].includes('id=v1%2Cv2'));
  assert.deepEqual(result, { v1: 600, v2: 3600 });
});

test('getVideoDurations는 51개 이상이면 50개씩 나눠 배치 조회한다', async () => {
  const calls = [];
  globalThis.fetch = mock.fn(async (url) => {
    calls.push(url);
    return jsonResponse(200, { items: [] });
  });

  const videoIds = Array.from({ length: 51 }, (_, i) => `v${i}`);
  await getVideoDurations('token', videoIds);

  assert.equal(calls.length, 2);
});
