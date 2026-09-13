const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const NEGLECT_THRESHOLD_DAYS = 7;

export const getElapsedDays = (savedAt, now = new Date()) =>
  Math.floor((now.getTime() - new Date(savedAt).getTime()) / MS_PER_DAY);

/**
 * 카드에 표시할 D-Day 상태를 계산한다.
 * - 보관 상태 영상은 저장 경과일과 관계없이 방치 판정에서 제외한다.
 * - 저장 일자가 없는 영상에는 방치 경고를 표시하지 않는다.
 */
export const getDdayState = (video, now = new Date()) => {
  if (video.isArchived) {
    return { tone: 'outline', label: '보관 중 · D-Day 제외', isNeglected: false };
  }

  if (!video.savedAt) {
    return null;
  }

  const elapsedDays = getElapsedDays(video.savedAt, now);

  if (elapsedDays >= NEGLECT_THRESHOLD_DAYS) {
    return {
      tone: 'warning',
      label: `D+${elapsedDays - NEGLECT_THRESHOLD_DAYS} · 7일 경과 청소 대상`,
      isNeglected: true,
      elapsedDays,
    };
  }

  return {
    tone: 'neutral',
    label: `D-${NEGLECT_THRESHOLD_DAYS - elapsedDays} · 저장 후 ${elapsedDays}일`,
    isNeglected: false,
    elapsedDays,
  };
};
