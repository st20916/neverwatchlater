export const DEFAULT_SORT = 'savedRecent';

export const SORT_OPTIONS = [
  { value: 'savedRecent', label: '저장 경과 최신순' },
  { value: 'savedOld', label: '저장 경과 오랜순' },
  { value: 'durationShort', label: '영상 길이 짧은순' },
  { value: 'durationLong', label: '영상 길이 긴순' },
];

// 길이 정보가 없는 영상(길이 조회 전/실패)은 정렬 방향과 무관하게 항상 맨 뒤로 보낸다.
function compareDuration(a, b, ascending) {
  const av = a.durationSeconds;
  const bv = b.durationSeconds;

  if (av == null && bv == null) return 0;
  if (av == null) return 1;
  if (bv == null) return -1;

  return ascending ? av - bv : bv - av;
}

// savedAt(ISO 문자열)을 1970년 기준 밀리초로 변환한다. getElapsedDays처럼 "일" 단위로
// floor하면 같은 날 저장된 영상들이 전부 동일한 값이 되어(특히 최근에 몰아서 저장한
// 경우) 정렬이 제자리인 것처럼 보이는 문제가 있어, 정렬은 분/초 단위까지 구분되는
// 원본 타임스탬프로 비교한다.
function savedTimeOrNull(video) {
  return video.savedAt ? new Date(video.savedAt).getTime() : null;
}

// 저장 일시 정보가 없는 영상은 정렬 방향과 무관하게 항상 맨 뒤로 보낸다.
function compareSavedTime(a, b, mostRecentFirst) {
  const at = savedTimeOrNull(a);
  const bt = savedTimeOrNull(b);

  if (at == null && bt == null) return 0;
  if (at == null) return 1;
  if (bt == null) return -1;

  return mostRecentFirst ? bt - at : at - bt;
}

const COMPARATORS = {
  savedRecent: (a, b) => compareSavedTime(a, b, true),
  savedOld: (a, b) => compareSavedTime(a, b, false),
  durationShort: (a, b) => compareDuration(a, b, true),
  durationLong: (a, b) => compareDuration(a, b, false),
};

export const sortVideos = (videos, sortKey) => {
  const compare = COMPARATORS[sortKey] ?? COMPARATORS[DEFAULT_SORT];
  return [...videos].sort(compare);
};
