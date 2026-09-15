import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import PlaylistSetupPage from './PlaylistSetupPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <PlaylistSetupPage />
    </MemoryRouter>,
  );

describe('PlaylistSetupPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('로그인 확인과 재생목록 설정이 모두 성공하면 완료 화면을 보여준다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ playlistId: 'PL123', created: true }),
      });

    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText('‘Neverwatchlater’ 재생목록이 동기화 대상으로 지정되었습니다. (새로 생성됨)'),
      ).toBeInTheDocument();
    });

    expect(screen.getByText('연결된 계정: user@example.com')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '정리 목록으로 이동' })).toBeInTheDocument();
  });

  it('로그인 세션이 없으면 실패 화면과 재시도 버튼을 보여준다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('로그인이 필요합니다.')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: '재생목록 설정 재시도' }),
    ).toBeInTheDocument();
  });
});
