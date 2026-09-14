import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { createPlaylist, findPlaylistByTitle } from './youtube.js';

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
