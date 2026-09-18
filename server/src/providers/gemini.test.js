import assert from 'node:assert/strict';
import { afterEach, beforeEach, mock, test } from 'node:test';

import { summarizeVideo } from './gemini.js';

let originalFetch;

beforeEach(() => {
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function geminiResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

function successBody(summaryLines) {
  return {
    candidates: [{ content: { parts: [{ text: JSON.stringify(summaryLines) }] } }],
  };
}

test('summarizeVideo는 Gemini 응답에서 3줄 요약 배열을 반환한다', async () => {
  let capturedUrl;
  let capturedBody;
  globalThis.fetch = mock.fn(async (url, options) => {
    capturedUrl = url;
    capturedBody = JSON.parse(options.body);
    return geminiResponse(200, successBody(['첫 번째.', '두 번째.', '세 번째.']));
  });

  const result = await summarizeVideo('abc123', { apiKey: 'key-1', model: 'gemini-test' });

  assert.deepEqual(result, ['첫 번째.', '두 번째.', '세 번째.']);
  assert.ok(capturedUrl.includes('gemini-test:generateContent'));
  assert.ok(capturedUrl.includes('key=key-1'));
  assert.equal(capturedBody.generationConfig.responseSchema.type, 'ARRAY');
  assert.deepEqual(capturedBody.contents[0].parts[0].fileData, {
    fileUri: 'https://www.youtube.com/watch?v=abc123',
  });
});

test('summarizeVideo는 apiKey가 없으면 즉시 에러를 던진다', async () => {
  globalThis.fetch = mock.fn(async () => {
    throw new Error('호출되면 안 됨');
  });

  await assert.rejects(
    () => summarizeVideo('abc123', { apiKey: '', model: 'gemini-test' }),
    /GEMINI_API_KEY/
  );
});

test('summarizeVideo는 Gemini가 오류 응답을 주면 에러를 던진다', async () => {
  globalThis.fetch = mock.fn(async () =>
    geminiResponse(429, { error: { message: '쿼터를 초과했습니다.' } })
  );

  await assert.rejects(
    () => summarizeVideo('abc123', { apiKey: 'key', model: 'gemini-test' }),
    /쿼터를 초과했습니다/
  );
});

test('summarizeVideo는 응답이 3개 문자열 배열이 아니면 에러를 던진다', async () => {
  globalThis.fetch = mock.fn(async () => geminiResponse(200, successBody(['한 줄만'])));

  await assert.rejects(
    () => summarizeVideo('abc123', { apiKey: 'key', model: 'gemini-test' }),
    /3줄 요약 형식이 아닙니다/
  );
});

test('summarizeVideo는 응답 텍스트가 JSON이 아니면 에러를 던진다', async () => {
  globalThis.fetch = mock.fn(async () =>
    geminiResponse(200, {
      candidates: [{ content: { parts: [{ text: '이건 JSON이 아님' }] } }],
    })
  );

  await assert.rejects(
    () => summarizeVideo('abc123', { apiKey: 'key', model: 'gemini-test' }),
    /파싱할 수 없습니다/
  );
});
