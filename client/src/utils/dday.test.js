import { describe, expect, it } from 'vitest';

import { getDdayBadge, getDdayCount, getDdayState } from './dday.js';

const at = (iso) => new Date(iso);

describe('dday', () => {
  it('저장한 날은 D+1로 시작한다', () => {
    expect(getDdayCount('2026-09-20T09:00:00', at('2026-09-20T18:00:00'))).toBe(1);
  });

  it('24시간이 지나지 않아도 날짜가 바뀌면 하루를 더한다', () => {
    expect(getDdayCount('2026-09-19T23:30:00', at('2026-09-20T08:00:00'))).toBe(2);
  });

  it('D+2까지는 정리 대상이 아니고 D+3부터 정리 대상이다', () => {
    const now = at('2026-09-20T12:00:00');
    const day2 = getDdayState({ savedAt: '2026-09-19T12:00:00' }, now);
    const day3 = getDdayState({ savedAt: '2026-09-18T12:00:00' }, now);

    expect(day2).toMatchObject({ dday: 2, isNeglected: false, tone: 'neutral' });
    expect(day3).toMatchObject({ dday: 3, isNeglected: true, tone: 'warning' });
  });

  it('배지는 두 자리 D+NN 으로 표시한다', () => {
    const now = at('2026-09-20T12:00:00');
    expect(getDdayBadge({ savedAt: '2026-09-20T01:00:00' }, now)).toMatchObject({
      text: 'D+01',
      tone: 'neutral',
    });
    expect(getDdayBadge({ savedAt: '2026-09-10T01:00:00' }, now)).toMatchObject({
      text: 'D+11',
      tone: 'warning',
    });
  });

  it('보관 영상은 D-Day 판정에서 제외한다', () => {
    expect(getDdayBadge({ savedAt: '2026-01-01', isArchived: true })).toMatchObject({
      text: '보관됨',
      isNeglected: false,
    });
  });

  it('저장 일자가 없으면 배지를 표시하지 않는다', () => {
    expect(getDdayBadge({})).toBeNull();
  });
});
