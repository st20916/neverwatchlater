import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import LandingPage from './LandingPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

describe('LandingPage', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('로그인하지 않은 상태에서는 Google 로그인 버튼을 보여준다', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: '로그인이 필요합니다.' }),
    });

    renderPage();

    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({ credentials: 'include' }),
      );
    });
  });

  it('로그인한 상태에서는 로그아웃 버튼을 보여주고, 클릭하면 로그아웃을 호출한다', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          user: { email: 'user@example.com', name: '홍길동', googleId: 'g-1' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ message: '로그아웃 되었습니다.' }),
      });

    renderPage();

    const logoutButton = await screen.findByRole('button', { name: '로그아웃' });
    expect(
      screen.queryByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).not.toBeInTheDocument();

    fireEvent.click(logoutButton);

    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
      ).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/logout'),
      expect.objectContaining({ method: 'POST', credentials: 'include' }),
    );
  });
});
