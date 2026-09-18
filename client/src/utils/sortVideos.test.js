import { describe, expect, it } from 'vitest';

import { sortVideos } from './sortVideos.js';

const video = (overrides) => ({
  videoId: 'v',
  savedAt: '2026-01-01T00:00:00.000Z',
  durationSeconds: 100,
  isArchived: false,
  ...overrides,
});

describe('sortVideos', () => {
  it('보관 영상은 정렬 기준과 무관하게 항상 목록 맨 아래로 내려간다', () => {
    // 보관 영상이 가장 오래됐고(오래된 순 1위) 가장 짧지만(짧은 순 1위) 맨 아래여야 한다.
    const archived = video({
      videoId: 'archived',
      savedAt: '2020-01-01T00:00:00.000Z',
      durationSeconds: 1,
      isArchived: true,
    });
    const older = video({ videoId: 'older', savedAt: '2026-01-01T00:00:00.000Z' });
    const newer = video({ videoId: 'newer', savedAt: '2026-06-01T00:00:00.000Z' });

    expect(sortVideos([archived, newer, older], 'savedOld').map((v) => v.videoId)).toEqual([
      'older',
      'newer',
      'archived',
    ]);
    expect(sortVideos([archived, older, newer], 'savedRecent').map((v) => v.videoId)).toEqual([
      'newer',
      'older',
      'archived',
    ]);
    expect(sortVideos([archived, older, newer], 'durationShort').map((v) => v.videoId)).toEqual([
      'older',
      'newer',
      'archived',
    ]);
  });

  it('savedRecent는 저장 시각이 늦은(최근) 영상을 먼저 정렬한다 — 같은 날이어도 시:분 단위까지 구분한다', () => {
    const earlier = video({ videoId: 'earlier', savedAt: '2026-01-15T08:00:00.000Z' });
    const later = video({ videoId: 'later', savedAt: '2026-01-15T20:00:00.000Z' });

    expect(sortVideos([earlier, later], 'savedRecent').map((v) => v.videoId)).toEqual([
      'later',
      'earlier',
    ]);
  });

  it('savedOld는 저장 시각이 이른(오래된) 영상을 먼저 정렬한다 — 같은 날이어도 시:분 단위까지 구분한다', () => {
    const earlier = video({ videoId: 'earlier', savedAt: '2026-01-15T08:00:00.000Z' });
    const later = video({ videoId: 'later', savedAt: '2026-01-15T20:00:00.000Z' });

    expect(sortVideos([earlier, later], 'savedOld').map((v) => v.videoId)).toEqual([
      'earlier',
      'later',
    ]);
  });

  it('savedAt이 없는 영상은 정렬 방향과 무관하게 맨 뒤로 보낸다', () => {
    const withDate = video({ videoId: 'has-date' });
    const noDate = video({ videoId: 'no-date', savedAt: null });

    expect(sortVideos([noDate, withDate], 'savedRecent').map((v) => v.videoId)).toEqual([
      'has-date',
      'no-date',
    ]);
    expect(sortVideos([noDate, withDate], 'savedOld').map((v) => v.videoId)).toEqual([
      'has-date',
      'no-date',
    ]);
  });

  it('durationShort/durationLong은 영상 길이 기준으로 정렬하고 길이 없는 영상은 맨 뒤로 보낸다', () => {
    const short = video({ videoId: 'short', durationSeconds: 60 });
    const long = video({ videoId: 'long', durationSeconds: 600 });
    const noDuration = video({ videoId: 'no-duration', durationSeconds: null });

    expect(
      sortVideos([long, noDuration, short], 'durationShort').map((v) => v.videoId),
    ).toEqual(['short', 'long', 'no-duration']);
    expect(
      sortVideos([short, noDuration, long], 'durationLong').map((v) => v.videoId),
    ).toEqual(['long', 'short', 'no-duration']);
  });
});
