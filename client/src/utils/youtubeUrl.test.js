import { describe, expect, it } from 'vitest';

import { countValidVideoUrls, extractCandidateUrls, extractVideoId } from './youtubeUrl.js';

describe('extractVideoId', () => {
  it('일반 watch URL, youtu.be, Shorts URL에서 videoId를 추출한다', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  it('재생목록 URL이나 일반 URL은 null을 반환한다', () => {
    expect(extractVideoId('https://www.youtube.com/playlist?list=PL123456789')).toBeNull();
    expect(extractVideoId('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});

describe('extractCandidateUrls', () => {
  it('텍스트에서 http(s) URL 토큰을 모두 뽑아낸다', () => {
    const text = '영상 https://youtu.be/dQw4w9WgXcQ 그리고 https://example.com/x 도 있어요.';
    expect(extractCandidateUrls(text)).toEqual([
      'https://youtu.be/dQw4w9WgXcQ',
      'https://example.com/x',
    ]);
  });
});

describe('countValidVideoUrls', () => {
  it('유효한 영상 URL의 고유 개수를 센다(중복 제거)', () => {
    const text = [
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ', // 같은 videoId
      'https://www.youtube.com/playlist?list=PL123456789', // 무효
    ].join('\n');

    expect(countValidVideoUrls(text)).toBe(1);
  });

  it('유효한 URL이 없으면 0을 반환한다', () => {
    expect(countValidVideoUrls('그냥 텍스트')).toBe(0);
    expect(countValidVideoUrls('')).toBe(0);
  });
});
