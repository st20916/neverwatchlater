import assert from 'node:assert/strict';
import { test } from 'node:test';

import { extractCandidateUrls, extractValidVideoUrls, extractVideoId } from './youtubeUrl.js';

test('extractVideoId는 일반 watch URL에서 videoId를 추출한다', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
});

test('extractVideoId는 다른 쿼리 파라미터와 섞인 watch URL도 처리한다', () => {
  assert.equal(
    extractVideoId('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&index=3'),
    'dQw4w9WgXcQ'
  );
});

test('extractVideoId는 youtu.be 단축 URL을 처리한다', () => {
  assert.equal(extractVideoId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10'), 'dQw4w9WgXcQ');
});

test('extractVideoId는 YouTube Shorts URL을 처리한다', () => {
  assert.equal(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractVideoId('https://m.youtube.com/shorts/dQw4w9WgXcQ/'), 'dQw4w9WgXcQ');
});

test('extractVideoId는 재생목록 URL은 null을 반환한다', () => {
  assert.equal(extractVideoId('https://www.youtube.com/playlist?list=PL123456789'), null);
});

test('extractVideoId는 유튜브가 아닌 일반 URL은 null을 반환한다', () => {
  assert.equal(extractVideoId('https://example.com/watch?v=dQw4w9WgXcQ'), null);
});

test('extractVideoId는 videoId 형식이 아닌 값은 null을 반환한다', () => {
  assert.equal(extractVideoId('https://www.youtube.com/watch?v=short'), null);
});

test('extractCandidateUrls는 텍스트에서 http(s) URL 토큰을 모두 뽑아낸다', () => {
  const text = `
    영상 모음이에요.
    https://www.youtube.com/watch?v=dQw4w9WgXcQ 이거 재밌어요.
    (참고: https://youtu.be/abcdEFGHijk) 이것도요.
    일반 링크도 있어요: https://example.com/some/page
  `;

  assert.deepEqual(extractCandidateUrls(text), [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/abcdEFGHijk',
    'https://example.com/some/page',
  ]);
});

test('extractCandidateUrls는 문장부호에 둘러싸인 URL의 후행 구두점을 제거한다', () => {
  assert.deepEqual(extractCandidateUrls('링크: https://youtu.be/abcdEFGHijk.'), [
    'https://youtu.be/abcdEFGHijk',
  ]);
});

test('extractCandidateUrls는 URL이 없으면 빈 배열을 반환한다', () => {
  assert.deepEqual(extractCandidateUrls('그냥 텍스트일 뿐입니다.'), []);
  assert.deepEqual(extractCandidateUrls(''), []);
  assert.deepEqual(extractCandidateUrls(undefined), []);
});

test('extractValidVideoUrls는 유효한 영상 URL만 골라 videoId와 함께 반환한다', () => {
  const text = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/playlist?list=PL123456789',
    'https://youtu.be/abcdEFGHijk',
    'https://example.com/not-youtube',
  ].join('\n');

  assert.deepEqual(extractValidVideoUrls(text), [
    { url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', videoId: 'dQw4w9WgXcQ' },
    { url: 'https://youtu.be/abcdEFGHijk', videoId: 'abcdEFGHijk' },
  ]);
});
