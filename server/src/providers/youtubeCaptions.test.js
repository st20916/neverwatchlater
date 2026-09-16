import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { getTranscript } from './youtubeCaptions.js';

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function htmlResponse(html) {
  return { ok: true, status: 200, text: async () => html };
}

function errorResponse(status) {
  return { ok: false, status, text: async () => '' };
}

function watchPageHtml(captionTracks) {
  return `<html><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${JSON.stringify(captionTracks)}}}};</script></html>`;
}

test('getTranscript는 한국어 자막이 있으면 한국어를 우선 사용한다', async () => {
  const calls = [];
  globalThis.fetch = mock.fn(async (url) => {
    calls.push(url);
    if (url.includes('watch?v=')) {
      return htmlResponse(
        watchPageHtml([
          { baseUrl: 'https://caption/en', languageCode: 'en' },
          { baseUrl: 'https://caption/ko', languageCode: 'ko' },
        ])
      );
    }
    if (url === 'https://caption/ko') {
      return htmlResponse('<transcript><text start="0" dur="1">안녕하세요</text><text start="1" dur="1">반갑습니다</text></transcript>');
    }
    throw new Error(`예상치 못한 요청: ${url}`);
  });

  const result = await getTranscript('video-1');

  assert.equal(result, '안녕하세요 반갑습니다');
  assert.ok(calls.some((url) => url === 'https://caption/ko'));
});

test('getTranscript는 한국어가 없으면 영어 자막을 사용한다', async () => {
  globalThis.fetch = mock.fn(async (url) => {
    if (url.includes('watch?v=')) {
      return htmlResponse(watchPageHtml([{ baseUrl: 'https://caption/en', languageCode: 'en' }]));
    }
    return htmlResponse('<transcript><text>hello world</text></transcript>');
  });

  const result = await getTranscript('video-2');

  assert.equal(result, 'hello world');
});

test('getTranscript는 한국어/영어 자막이 모두 없으면 null을 반환한다', async () => {
  globalThis.fetch = mock.fn(async (url) => {
    if (url.includes('watch?v=')) {
      return htmlResponse(watchPageHtml([{ baseUrl: 'https://caption/ja', languageCode: 'ja' }]));
    }
    throw new Error('자막 URL을 요청하면 안 됨');
  });

  const result = await getTranscript('video-3');

  assert.equal(result, null);
});

test('getTranscript는 자막 트랙 자체가 없으면 null을 반환한다', async () => {
  globalThis.fetch = mock.fn(async () => htmlResponse('<html>자막 정보 없음</html>'));

  const result = await getTranscript('video-4');

  assert.equal(result, null);
});

test('getTranscript는 HTML 엔티티를 디코딩하고 공백을 정리한다', async () => {
  globalThis.fetch = mock.fn(async (url) => {
    if (url.includes('watch?v=')) {
      return htmlResponse(watchPageHtml([{ baseUrl: 'https://caption/ko', languageCode: 'ko' }]));
    }
    return htmlResponse('<transcript><text>A &amp;   B  \n  C</text></transcript>');
  });

  const result = await getTranscript('video-5');

  assert.equal(result, 'A & B C');
});

test('getTranscript는 영상 페이지 요청이 실패하면 예외를 던진다(재시도 대상)', async () => {
  globalThis.fetch = mock.fn(async () => errorResponse(500));

  await assert.rejects(() => getTranscript('video-6'), /영상 페이지를 불러오지 못했습니다/);
});

test('getTranscript는 자막 URL 요청이 실패하면 예외를 던진다(재시도 대상)', async () => {
  globalThis.fetch = mock.fn(async (url) => {
    if (url.includes('watch?v=')) {
      return htmlResponse(watchPageHtml([{ baseUrl: 'https://caption/ko', languageCode: 'ko' }]));
    }
    return errorResponse(500);
  });

  await assert.rejects(() => getTranscript('video-7'), /자막 데이터를 가져오지 못했습니다/);
});
