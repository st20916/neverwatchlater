import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../api/authApi.js';
import { getPlaylistStatus } from '../api/playlistApi.js';
import { bulkImportVideos } from '../api/videoApi.js';
import BulkImportPage from './BulkImportPage.jsx';

vi.mock('../api/authApi.js', () => ({
  fetchCurrentUser: vi.fn(),
}));

vi.mock('../api/playlistApi.js', () => ({
  getPlaylistStatus: vi.fn(),
}));

vi.mock('../api/videoApi.js', () => ({
  bulkImportVideos: vi.fn(),
}));

const renderPage = () => {
  const router = createMemoryRouter(
    [
      { path: '/videos/bulk-import', element: <BulkImportPage /> },
      { path: '/videos', element: <div>정리 목록</div> },
      { path: '/auth/loading', element: <div>로그인</div> },
      { path: '/playlist-setup', element: <div>재생목록 설정</div> },
    ],
    { initialEntries: ['/videos/bulk-import'] },
  );

  const view = render(<RouterProvider router={router} />);
  return { router, ...view };
};

const readyPage = () => {
  fetchCurrentUser.mockResolvedValue({ user: { name: '효주' } });
  getPlaylistStatus.mockResolvedValue({ playlist: { playlistId: 'PL1' } });
  return renderPage();
};

describe('BulkImportPage', () => {
  beforeEach(() => {
    fetchCurrentUser.mockReset();
    getPlaylistStatus.mockReset();
    bulkImportVideos.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('로그인되지 않으면 로그인 안내를 보여준다', async () => {
    fetchCurrentUser.mockRejectedValue(new Error('로그인이 필요합니다.'));

    renderPage();

    expect(await screen.findByText('로그인이 필요합니다')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '로그인하러 가기' })).toHaveAttribute(
      'href',
      '/auth/loading',
    );
  });

  it('전용 재생목록이 없으면 설정 안내를 보여준다', async () => {
    fetchCurrentUser.mockResolvedValue({ user: { name: '효주' } });
    getPlaylistStatus.mockResolvedValue({ playlist: null });

    renderPage();

    expect(
      await screen.findByText('전용 재생목록이 아직 없습니다'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '재생목록 설정하러 가기' }),
    ).toHaveAttribute('href', '/playlist-setup');
  });

  it('준비되면 대량 등록 폼을 보여준다', async () => {
    readyPage();

    expect(
      await screen.findByRole('heading', { name: '대량 링크 등록' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('유튜브 영상 URL 붙여넣기')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '등록하기' })).toBeDisabled();
    expect(screen.getByRole('link', { name: '취소' })).toHaveAttribute(
      'href',
      '/videos',
    );
  });

  it('취소를 누르면 정리 목록으로 돌아간다', async () => {
    const { router } = readyPage();

    fireEvent.click(await screen.findByRole('link', { name: '취소' }));

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/videos');
    });
  });

  it('등록에 성공하면 정리 목록으로 이동하는 버튼을 보여준다', async () => {
    const { router } = readyPage();

    await screen.findByRole('heading', { name: '대량 링크 등록' });

    bulkImportVideos.mockResolvedValue({
      total: 1,
      successCount: 1,
      duplicateCount: 0,
      invalidCount: 0,
      failedCount: 0,
      results: [
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
          status: 'success',
        },
      ],
    });

    fireEvent.change(screen.getByLabelText('유튜브 영상 URL 붙여넣기'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

    const link = await screen.findByRole('link', { name: '등록한 영상 보러가기' });
    expect(link).toHaveAttribute('href', '/videos');

    fireEvent.click(link);

    await waitFor(() => {
      expect(router.state.location.pathname).toBe('/videos');
    });
    expect(router.state.location.state).toEqual({
      importedVideoIds: ['dQw4w9WgXcQ'],
    });
  });

  it('성공 건이 없으면 정리 목록 이동 버튼을 보여주지 않는다', async () => {
    readyPage();

    await screen.findByRole('heading', { name: '대량 링크 등록' });

    bulkImportVideos.mockResolvedValue({
      total: 1,
      successCount: 0,
      duplicateCount: 1,
      invalidCount: 0,
      failedCount: 0,
      results: [
        {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoId: 'dQw4w9WgXcQ',
          status: 'duplicate',
        },
      ],
    });

    fireEvent.change(screen.getByLabelText('유튜브 영상 URL 붙여넣기'), {
      target: { value: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '등록하기' }));

    expect(await screen.findByText('새로 등록된 영상이 없습니다.')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: '등록한 영상 보러가기' }),
    ).not.toBeInTheDocument();
  });
});
