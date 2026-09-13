const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

/**
 * 프로토타입 화면 확인용 더미 데이터. 실제 YouTube 동기화 결과는 사용하지 않는다.
 * summary가 null인 항목은 자막이 없어 요약 불가 상태인 카드를 나타낸다.
 */
export const MOCK_VIDEOS = [
  {
    id: 'v1',
    title: '주말 30분으로 끝내는 리액트 상태관리 정리',
    channelName: '프론트엔드 노트',
    savedAt: daysAgo(21),
    isArchived: false,
    summary: [
      '컴포넌트 지역 상태와 전역 상태를 나누는 기준을 먼저 정한다.',
      '서버 데이터는 캐시 계층에 두고 화면 상태와 분리해 관리한다.',
      '전역 상태는 실제로 여러 화면이 공유하는 값만 남긴다.',
    ],
  },
  {
    id: 'v2',
    title: '하루 10분 영어 섀도잉, 3개월 기록',
    channelName: '데일리 루틴',
    savedAt: daysAgo(12),
    isArchived: false,
    summary: [
      '짧은 문장을 반복해 억양과 리듬을 먼저 익힌다.',
      '녹음해서 원본과 비교하는 과정이 교정 속도를 올린다.',
      '매일 같은 시간에 하는 고정 루틴이 지속성을 만든다.',
    ],
  },
  {
    id: 'v3',
    title: '개발자 사이드 프로젝트 회고 (2시간 풀버전)',
    channelName: '메이커 로그',
    savedAt: daysAgo(9),
    isArchived: false,
    summary: null,
  },
  {
    id: 'v4',
    title: '작은 방을 넓게 쓰는 수납 구조 만들기',
    channelName: '리빙 스터디',
    savedAt: daysAgo(4),
    isArchived: false,
    summary: [
      '수직 공간을 먼저 쓰면 바닥 면적을 그대로 남길 수 있다.',
      '자주 쓰는 물건만 손 높이에 두고 나머지는 위아래로 분산한다.',
      '수납장 깊이를 통일하면 시선이 정리되어 더 넓어 보인다.',
    ],
  },
  {
    id: 'v5',
    title: '포트폴리오용 디자인 시스템 만들기',
    channelName: 'UI 아카이브',
    savedAt: daysAgo(15),
    isArchived: true,
    summary: [
      '색과 타이포를 토큰으로 먼저 고정하고 컴포넌트를 쌓는다.',
      '컴포넌트마다 기본 상태와 눌림 상태만 정의해도 충분하다.',
      '문서와 코드의 토큰 이름을 일치시켜야 유지보수가 된다.',
    ],
  },
];
