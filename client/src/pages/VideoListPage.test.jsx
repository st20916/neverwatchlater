import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchVideos, syncVideosNow } from '../api/videoApi.js';
import VideoListPage from './VideoListPage.jsx';

vi.mock('../api/videoApi.js', () => ({
  fetchVideos: vi.fn(),
  syncVideosNow: vi.fn(),
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <VideoListPage />
    </MemoryRouter>,
  );

describe('VideoListPage', () => {
  beforeEach(() => {
    fetchVideos.mockReset();
    syncVideosNow.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('오래 방치된 영상을 먼저 표시한다', async () => {
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

    expect(
      await screen.findByText('유튜브와 통신하지 못해 동기화가 중단되었습니다'),
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

    fireEvent.click(screen.getByRole('button', { name: '지금 동기화' }));

    await screen.findByText('갱신된 목록');
    expect(syncVideosNow).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('동기화를 완료했습니다.')).toBeInTheDocument();
  });

  it('나중에 버튼을 누르면 아직 연결되지 않았다는 안내를 표시한다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo()],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });

    renderPage();
    await screen.findByText('영상 제목');

    fireEvent.click(screen.getByRole('button', { name: '나중에' }));

    expect(
      await screen.findByText('이 기능은 아직 연결되지 않았습니다. 곧 제공될 예정입니다.'),
    ).toBeInTheDocument();
  });

  it('바로 보기 버튼을 누르면 유튜브 영상을 새 탭으로 연다', async () => {
    fetchVideos.mockResolvedValue({
      videos: [makeVideo({ videoId: 'abc123' })],
      lastSyncedAt: null,
      synced: true,
      syncFailed: false,
    });
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {});

    renderPage();
    await screen.findByText('영상 제목');

    fireEvent.click(screen.getByRole('button', { name: '▶ 바로 보기' }));

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.youtube.com/watch?v=abc123',
      '_blank',
      'noopener,noreferrer',
    );
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
});
