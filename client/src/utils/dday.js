const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const NEGLECT_THRESHOLD_DAYS = 2;

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

/**
 * 저장일과 오늘 사이의 달력 날짜 차이(로컬 자정 기준).
 * 어제 밤에 저장하고 오늘 아침에 보면 24시간이 안 지났어도 1일로 센다.
 */
export const getElapsedDays = (savedAt, now = new Date()) =>
  Math.max(
    0,
    Math.round(
      (startOfDay(now).getTime() - startOfDay(savedAt).getTime()) / MS_PER_DAY,
    ),
  );

/**
 * 카드에 표시할 D+N 값. 저장한 날을 D+1로 두고 하루마다 1씩 늘어난다.
 */
export const getDdayCount = (savedAt, now = new Date()) =>
  getElapsedDays(savedAt, now) + 1;

/**
 * 카드에 표시할 D-Day 상태를 계산한다.
 * - 보관 상태 영상은 저장 경과일과 관계없이 방치 판정에서 제외한다.
 * - 저장 일자가 없는 영상에는 방치 경고를 표시하지 않는다.
 * - D+N이 2를 초과(D+3부터)하면 정리 대상으로 본다.
 */
export const getDdayState = (video, now = new Date()) => {
  if (video.isArchived) {
    return { tone: 'outline', label: '보관 중 · D-Day 제외', isNeglected: false };
  }

  if (!video.savedAt) {
    return null;
  }

  const dday = getDdayCount(video.savedAt, now);

  if (dday > NEGLECT_THRESHOLD_DAYS) {
    return {
      tone: 'warning',
      label: `D+${dday} · ${NEGLECT_THRESHOLD_DAYS}일 초과 정리 대상`,
      isNeglected: true,
      dday,
    };
  }

  return {
    tone: 'neutral',
    label: `D+${dday} · 저장 ${dday}일째`,
    isNeglected: false,
    dday,
  };
};

const padTwo = (value) => String(Math.max(0, value)).padStart(2, '0');

/**
 * 랜딩 데모 카드와 같은 D+08 표기. 보관 영상은 경과일 대신 '보관됨'으로 표시한다.
 */
export const getDdayBadge = (video, now = new Date()) => {
  const state = getDdayState(video, now);

  if (!state) {
    return null;
  }

  if (video.isArchived) {
    return { text: '보관됨', tone: 'archived', isNeglected: false };
  }

  return {
    text: `D+${padTwo(state.dday)}`,
    tone: state.isNeglected ? 'warning' : 'neutral',
    isNeglected: state.isNeglected,
  };
};
