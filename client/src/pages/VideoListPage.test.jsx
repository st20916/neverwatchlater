import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  deleteVideo,
  fetchVideos,
  resetVideoDday,
  setVideoArchived,
  subscribeToSummaryUpdates,
  syncVideosNow,
} from '../api/videoApi.js';
import VideoListPage from './VideoListPage.jsx';

vi.mock('../api/videoApi.js', () => ({
  fetchVideos: vi.fn(),
  syncVideosNow: vi.fn(),
  deleteVideo: vi.fn(),
  resetVideoDday: vi.fn(),
  setVideoArchived: vi.fn(),
  subscribeToSummaryUpdates: vi.fn(() => () => {}),
}));

const daysAgo = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const makeVideo = (overrides = {}) => ({
  videoId: 'v1',
  title: '영상 제목',
  channelName: '채널',
  savedAt: daysAgo(1),
  isArchived: false,
  durationSeconds: 120,
  thumbnailUrl: '',
  summaryStatus: 'done',
  summary: ['a', 'b', 'c'],
  ...overrides,
});

// jsdom에는 IntersectionObserver가 없어 센티널 노출을 직접 흉내 낸다.
let observers = [];

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.targets = new Set();
    observers.push(this);
  }

  observe(element) {
    this.targets.add(element);
  }

  unobserve(element) {
    this.targets.delete(element);
  }

  disconnect() {
    observers = observers.filter((observer) => observer !== this);
  }
}

const getSentinel = () => document.querySelector('.video-list-page__load-more');

const reachSentinel = () => {
  const sentinel = getSentinel();
  observers
    .filter((observer) => observer.targets.has(sentinel))
    .forEach((observer) =>
      observer.callback([{ isIntersecting: true, target: sentinel }]),
    );
};

const renderPage = (entries = ['/videos']) =>
  render(
    <MemoryRouter initialEntries={entries}>
      <VideoListPage />
    </MemoryRouter>,
  );

const chooseSort = (label) => {
  fireEvent.click(screen.getByRole('button', { name: '정렬' }));
  fireEvent.click(screen.getByRole('option', { name: label }));
};

describe('VideoListPage', () => {
  beforeEach(() => {
    observers = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    fetchVideos.mockReset();
    syncVideosNow.mockReset();
    deleteVideo.mockReset();
    resetVideoDday.mockReset();
    setVideoArchived.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('기본 정렬(저장 오래된 순)은 오래 방치된 영상을 먼저 표시한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({ videoId: 'recent', title: '최근 저장', savedAt: daysAgo(1) }),
        makeVideo({ videoId: 'old', title: '오래된 저장', savedAt: daysAgo(20) }),
      ],
      lastSyncedAt: '2026-09-16T00:00:00.000Z',
      synced: true,
      syncFailed: false,
    });

    renderPage();

    const titles = await screen.findAllByRole('heading', { level: 3 });
    expect(titles[0].textContent).toBe('오래된 저장');
  });

  it('정렬을 저장 경과 최신순으로 바꾸면 최근 저장된 영상이 먼저 표시된다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({ videoId: 'old', title: '오래된 저장', savedAt: daysAgo(20) }),
        makeVideo({ videoId: 'recent', title: '최근 저장', savedAt: daysAgo(1) }),
      ],
      lastSyncedAt: '2026-09-16T00:00:00.000Z',
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findAllByRole('heading', { level: 3 });

    chooseSort('저장 경과 최신순');

    const titles = await screen.findAllByRole('heading', { level: 3 });
    expect(titles[0].textContent).toBe('최근 저장');
  });

  it('같은 날 저장된 영상도 저장 시각(시:분) 기준으로 정확히 정렬된다', async () => {
    // 두 영상 모두 같은 달력 날짜(2026-01-15)에 저장됐지만 시각은 12시간 차이난다.
    // 예전 구현은 "일" 단위로 반올림해 비교해서 같은 날이면 동점 처리(=정렬이 안 먹힘)되던
    // 버그가 있었다 — 이 테스트는 그 회귀를 막는다.
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({
          videoId: 'earlier',
          title: '먼저 저장',
          savedAt: '2026-01-15T08:00:00.000Z',
        }),
        makeVideo({
          videoId: 'later',
          title: '나중 저장',
          savedAt: '2026-01-15T20:00:00.000Z',
        }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();

    // 기본 정렬(오래된 순)에서는 먼저 저장된 영상이 위에 나와야 한다.
    expect((await screen.findAllByRole('heading', { level: 3 }))[0].textContent).toBe(
      '먼저 저장',
    );

    chooseSort('저장 경과 최신순');

    expect((await screen.findAllByRole('heading', { level: 3 }))[0].textContent).toBe(
      '나중 저장',
    );
  });

  it('정렬을 영상 길이순으로 바꾸면 길이 기준으로 다시 정렬된다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({ videoId: 'long', title: '긴 영상', durationSeconds: 600 }),
        makeVideo({ videoId: 'short', title: '짧은 영상', durationSeconds: 60 }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findAllByRole('heading', { level: 3 });

    chooseSort('영상 길이 짧은순');
    expect((await screen.findAllByRole('heading', { level: 3 }))[0].textContent).toBe(
      '짧은 영상',
    );

    chooseSort('영상 길이 긴순');
    expect((await screen.findAllByRole('heading', { level: 3 }))[0].textContent).toBe(
      '긴 영상',
    );
  });

  it('로그인하지 않았으면 로그인 안내를 표시한다', async () => {
    const error = new Error('로그인이 필요합니다.');
    error.status = 401;
    fetchVideos.mockRejectedValue(error);

    renderPage();

    expect(await screen.findByText('로그인이 필요합니다')).toBeInTheDocument();
  });

  it('전용 재생목록이 없으면 설정 안내를 표시한다', async () => {
    const error = new Error('전용 재생목록이 설정되지 않았습니다.');
    error.status = 409;
    fetchVideos.mockRejectedValue(error);

    renderPage();

    expect(
      await screen.findByText('전용 재생목록이 아직 없습니다'),
    ).toBeInTheDocument();
  });

  it('동기화가 실패한 상태로 응답하면 재시도 안내를 표시한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo()],
      lastSyncedAt: '2026-09-16T00:00:00.000Z',
      synced: false,
      syncFailed: true,
    });

    renderPage();

    expect(await screen.findByText('동기화 실패')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: '동기화 재시도' }),
    ).toBeInTheDocument();
  });

  it('지금 동기화 버튼을 누르면 동기화 API를 호출하고 목록을 갱신한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ title: '이전 목록' })],
      lastSyncedAt: '2026-09-16T00:00:00.000Z',
      synced: false,
      syncFailed: false,
    });
    syncVideosNow.mockResolvedValue({
      videos: [makeVideo({ title: '갱신된 목록' })],
      lastSyncedAt: '2026-09-16T01:00:00.000Z',
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('이전 목록');

    fireEvent.click(screen.getByRole('button', { name: '목록 동기화' }));

    await screen.findByText('갱신된 목록');
    expect(syncVideosNow).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('동기화를 완료했습니다.')).toBeInTheDocument();
  });

  it('나중에 버튼을 누르면 저장 일자가 초기화되어 방치 경고가 사라진다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'v1', savedAt: daysAgo(20) })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    resetVideoDday.mockResolvedValue({
      video: makeVideo({ videoId: 'v1', savedAt: daysAgo(0) }),
    });

    renderPage();
    await screen.findByText('영상 제목');
    expect(screen.getByText('D+21')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '나중에' }));

    expect(await screen.findByText('저장 일자를 초기화했습니다.')).toBeInTheDocument();
    expect(resetVideoDday).toHaveBeenCalledWith('v1');
    expect(screen.queryByText('D+21')).not.toBeInTheDocument();
  });

  it('보관하기 버튼을 누르면 보관 탭으로 이동하고 보관 해제로 되돌릴 수 있다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'v1', title: '보관할 영상', isArchived: false })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    setVideoArchived.mockImplementation(async (videoId, isArchived) => ({
      video: makeVideo({ videoId, title: '보관할 영상', isArchived }),
    }));

    renderPage();
    await screen.findByText('보관할 영상');

    fireEvent.click(screen.getByRole('button', { name: '보관' }));

    expect(await screen.findByText('영상을 보관했습니다.')).toBeInTheDocument();
    expect(setVideoArchived).toHaveBeenCalledWith('v1', true);
    expect(await screen.findByRole('button', { name: '보관취소' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '보관취소' }));

    expect(await screen.findByText('보관을 해제했습니다.')).toBeInTheDocument();
    expect(setVideoArchived).toHaveBeenLastCalledWith('v1', false);
  });

  it('탭을 전환하면 해당 조건의 영상만 보여주고 개수를 표시한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({ videoId: 'v1', title: '방치 영상', savedAt: daysAgo(20) }),
        makeVideo({ videoId: 'v2', title: '최근 영상', savedAt: daysAgo(1) }),
        makeVideo({ videoId: 'v3', title: '보관 영상', savedAt: daysAgo(30), isArchived: true }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('방치 영상');

    // 전체 3 / 정리 대상 1(보관 영상은 방치 판정 제외) / 보관 1
    expect(screen.getByRole('tab', { name: '전체 3개' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '정리 대상 1개' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '보관 1개' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '정리 대상 1개' }));

    expect(screen.getByText('방치 영상')).toBeInTheDocument();
    expect(screen.queryByText('최근 영상')).not.toBeInTheDocument();
    expect(screen.queryByText('보관 영상')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '보관 1개' }));

    expect(screen.getByText('보관 영상')).toBeInTheDocument();
    expect(screen.queryByText('방치 영상')).not.toBeInTheDocument();
  });

  it('전체 탭의 기본 정렬에서 보관 영상은 가장 아래에 배치된다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        // 보관 영상이 가장 오래 저장됐지만(오래된 순 1위) 보관 상태라 맨 아래로 내려간다.
        makeVideo({ videoId: 'v1', title: '보관 영상', savedAt: daysAgo(90), isArchived: true }),
        makeVideo({ videoId: 'v2', title: '오래된 영상', savedAt: daysAgo(20) }),
        makeVideo({ videoId: 'v3', title: '최근 영상', savedAt: daysAgo(1) }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('보관 영상');

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent);
    expect(titles).toEqual(['오래된 영상', '최근 영상', '보관 영상']);
  });

  it('안볼래요 버튼을 누르면 삭제 API를 호출하고 성공하면 목록에서 사라진다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'v1', title: '삭제할 영상' })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    deleteVideo.mockResolvedValue({ videos: [] });

    renderPage();
    await screen.findByText('삭제할 영상');

    fireEvent.click(screen.getByRole('button', { name: '안볼래요' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    expect(await screen.findByText('처리 중…')).toBeInTheDocument();
    expect(deleteVideo).toHaveBeenCalledWith('v1');

    await waitFor(() => {
      expect(screen.queryByText('삭제할 영상')).not.toBeInTheDocument();
    });
  });

  it('안볼래요가 실패하면 오류 토스트를 표시하고 목록은 그대로 유지한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'v1', title: '삭제 실패 영상' })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    deleteVideo.mockRejectedValue(new Error('실패'));

    renderPage();
    await screen.findByText('삭제 실패 영상');

    fireEvent.click(screen.getByRole('button', { name: '안볼래요' }));
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));

    expect(
      await screen.findByText('영상을 삭제하지 못했습니다. 다시 시도해 주세요.'),
    ).toBeInTheDocument();
    expect(screen.getByText('삭제 실패 영상')).toBeInTheDocument();
  });

  it('썸네일을 클릭하면 유튜브 영상을 새 탭으로 연다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'abc123' })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderPage();
    await screen.findByText('영상 제목');

    fireEvent.click(screen.getByRole('button', { name: '바로 보기' }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc123',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('링크 대량 등록은 업로드 아이콘과 함께 벌크 등록 페이지로 연결한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo()],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();

    const link = await screen.findByRole('link', { name: '링크 대량 등록' });
    expect(link).toHaveAttribute('href', '/videos/bulk-import');
    expect(link.querySelector('svg')).not.toBeNull();
  });

  it('영상이 없으면 빈 상태 안내를 표시한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();

    expect(await screen.findByText('정리할 영상이 없습니다')).toBeInTheDocument();
  });

  it('SSE로 요약 완료 이벤트가 오면 새로고침 없이 해당 카드만 갱신된다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [
        makeVideo({ videoId: 'v1', title: '영상 제목', summaryStatus: 'pending', summary: null }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('영상 제목');
    expect(await screen.findByText('AI 요약을 생성하고 있습니다.')).toBeInTheDocument();

    const onUpdate = subscribeToSummaryUpdates.mock.calls.at(-1)[0];
    act(() => {
      onUpdate({ videoId: 'v1', summaryStatus: 'done', summary: ['첫 줄', '둘째 줄', '셋째 줄'] });
    });

    expect(await screen.findByText('첫 줄')).toBeInTheDocument();
    expect(screen.queryByText('AI 요약을 생성하고 있습니다.')).not.toBeInTheDocument();
  });

  it('영상이 5개 이하면 스크롤 로드 센티널을 두지 않는다', async () => {
    fetchVideos.mockResolvedValue({
      videos: Array.from({ length: 5 }, (_, i) =>
        makeVideo({ videoId: `v${i}`, title: `영상 ${i}` }),
      ),
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('영상 0');

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(getSentinel()).toBeNull();
  });

  it('영상이 5개를 넘으면 목록 끝으로 스크롤할 때마다 5개씩 이어서 보여준다', async () => {
    fetchVideos.mockResolvedValue({
      // 기본 정렬이 "저장 오래된 순"이므로 v0이 가장 오래된 영상이어야 맨 앞에 온다.
      videos: Array.from({ length: 12 }, (_, i) =>
        makeVideo({ videoId: `v${i}`, title: `영상 ${i}`, savedAt: daysAgo(12 - i) }),
      ),
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('영상 0');

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
    expect(screen.queryByText('영상 5')).not.toBeInTheDocument();
    expect(observers.some((observer) => observer.targets.has(getSentinel()))).toBe(true);

    act(() => reachSentinel());
    await screen.findByText('영상 5');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(10);

    act(() => reachSentinel());
    await screen.findByText('영상 11');
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(12);
    expect(getSentinel()).toBeNull();
  });

  it('탭을 바꾸면 다시 5개부터 보여준다', async () => {
    fetchVideos.mockResolvedValue({
      videos: Array.from({ length: 12 }, (_, i) =>
        makeVideo({ videoId: `v${i}`, title: `영상 ${i}`, savedAt: daysAgo(30 - i) }),
      ),
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('영상 0');
    act(() => reachSentinel());
    await screen.findByText('영상 5');

    fireEvent.click(screen.getByRole('tab', { name: '정리 대상 12개' }));

    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(5);
  });

  it('대량 등록 직후 진입하면 방금 등록한 영상을 보여주고 포커스한다', async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    fetchVideos.mockResolvedValue({
      videos: [
        ...Array.from({ length: 6 }, (_, i) =>
          makeVideo({
            videoId: `old-${i}`,
            title: `오래된 영상 ${i}`,
            savedAt: daysAgo(20 - i),
          }),
        ),
        makeVideo({
          videoId: 'imported',
          title: '방금 등록한 영상',
          savedAt: daysAgo(0),
        }),
      ],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage([
      {
        pathname: '/videos',
        state: { importedVideoIds: ['imported'] },
      },
    ]);

    expect(await screen.findByText('방금 등록한 영상')).toBeInTheDocument();
    expect(screen.queryByText('오래된 영상 0')).not.toBeInTheDocument();
    expect(document.getElementById('video-card-imported')).toHaveClass(
      'video-card--highlight',
    );
    expect(
      document.querySelector('.video-list-page__item--highlight'),
    ).not.toBeNull();
    expect(document.getElementById('video-card-imported')).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalled();
  });
});
