const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const lines = (...items) => items;

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
    duration: '18:24',
    isArchived: false,
    summary: lines(
      '컴포넌트 지역 상태와 전역 상태를 나누는 기준을 먼저 정한다.',
      '서버 데이터는 캐시 계층에 두고 화면 상태와 분리해 관리한다.',
      '전역 상태는 실제로 여러 화면이 공유하는 값만 남긴다.',
    ),
  },
  {
    id: 'v2',
    title: '하루 10분 영어 섀도잉, 3개월 기록',
    channelName: '데일리 루틴',
    savedAt: daysAgo(12),
    duration: '11:08',
    isArchived: false,
    summary: lines(
      '짧은 문장을 반복해 억양과 리듬을 먼저 익힌다.',
      '녹음해서 원본과 비교하는 과정이 교정 속도를 올린다.',
      '매일 같은 시간에 하는 고정 루틴이 지속성을 만든다.',
    ),
  },
  {
    id: 'v3',
    title: '개발자 사이드 프로젝트 회고 (2시간 풀버전)',
    channelName: '메이커 로그',
    savedAt: daysAgo(9),
    duration: '2:04:11',
    isArchived: false,
    summary: null,
  },
  {
    id: 'v4',
    title: '작은 방을 넓게 쓰는 수납 구조 만들기',
    channelName: '리빙 스터디',
    savedAt: daysAgo(4),
    duration: '16:42',
    isArchived: false,
    summary: lines(
      '수직 공간을 먼저 쓰면 바닥 면적을 그대로 남길 수 있다.',
      '자주 쓰는 물건만 손 높이에 두고 나머지는 위아래로 분산한다.',
      '수납장 깊이를 통일하면 시선이 정리되어 더 넓어 보인다.',
    ),
  },
  {
    id: 'v5',
    title: '포트폴리오용 디자인 시스템 만들기',
    channelName: 'UI 아카이브',
    savedAt: daysAgo(15),
    duration: '22:17',
    isArchived: true,
    summary: lines(
      '색과 타이포를 토큰으로 먼저 고정하고 컴포넌트를 쌓는다.',
      '컴포넌트마다 기본 상태와 눌림 상태만 정의해도 충분하다.',
      '문서와 코드의 토큰 이름을 일치시켜야 유지보수가 된다.',
    ),
  },
  {
    id: 'v6',
    title: '일의 본질을 다시 생각하는 시간',
    channelName: 'Study Archive',
    savedAt: daysAgo(18),
    duration: '16:42',
    isArchived: false,
    summary: lines(
      '바쁘게 움직이는 것과 중요한 일을 하는 것은 다르다.',
      '집중을 위해서는 덜어내는 선택이 필요하다.',
      '오늘의 작은 결정이 내일의 시간을 만든다.',
    ),
  },
  {
    id: 'v7',
    title: '읽지 않은 뉴스레터를 정리하는 방법',
    channelName: '인박스 클린',
    savedAt: daysAgo(14),
    duration: '09:31',
    isArchived: false,
    summary: lines(
      '구독 목록을 먼저 줄이면 도착량 자체가 줄어든다.',
      '눈에 띄는 제목보다 실제로 읽은 비율을 기준으로 남긴다.',
      '한 주에 한 번만 열어보는 고정 시간이 미루기를 줄인다.',
    ),
  },
  {
    id: 'v8',
    title: '노트북 배터리 수명을 늘리는 설정 모음',
    channelName: '기기 관리',
    savedAt: daysAgo(11),
    duration: '13:05',
    isArchived: false,
    summary: lines(
      '충전 상한을 80% 근처로 두면 배터리 노화가 느려진다.',
      '백그라운드 앱과 키보드 조명을 먼저 줄인다.',
      '고성능 모드는 작업할 때만 켜는 편이 낫다.',
    ),
  },
  {
    id: 'v9',
    title: '주간 회고를 15분 안에 끝내는 템플릿',
    channelName: '메이커 로그',
    savedAt: daysAgo(8),
    duration: '15:20',
    isArchived: false,
    summary: lines(
      '한 일, 못 한 일, 다음 주 한 가지로만 적는다.',
      '감정 평가보다 방해 요인을 구체적으로 적는 편이 낫다.',
      '같은 질문에 매주 답하면 패턴이 보인다.',
    ),
  },
  {
    id: 'v10',
    title: '집중이 풀릴 때 쓰는 5분 리셋 루틴',
    channelName: '데일리 루틴',
    savedAt: daysAgo(6),
    duration: '07:44',
    isArchived: false,
    summary: lines(
      '화면을 끄고 물을 마시는 것으로 전환을 표시한다.',
      '다음 25분만의 목표를 한 문장으로 다시 쓴다.',
      '완벽한 컨디션을 기다리지 않고 작은 재시작을 고른다.',
    ),
  },
  {
    id: 'v11',
    title: '홈 화면을 비우는 미니멀 정리',
    channelName: '리빙 스터디',
    savedAt: daysAgo(2),
    duration: '12:58',
    isArchived: false,
    summary: lines(
      '자주 쓰는 앱만 남기고 나머지는 검색으로 연다.',
      '알림은 대화와 일정만 통과시킨다.',
      '빈 화면이 다음 행동을 고르는 시간을 벌어준다.',
    ),
  },
  {
    id: 'v12',
    title: '첫 커밋 전에 하는 프로젝트 체크리스트',
    channelName: '프론트엔드 노트',
    savedAt: daysAgo(1),
    duration: '10:16',
    isArchived: false,
    summary: null,
  },
];
