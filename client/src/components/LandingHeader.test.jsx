import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchCurrentUser } from '../api/authApi';
import LandingHeader from './LandingHeader';

vi.mock('../api/authApi', () => ({
  fetchCurrentUser: vi.fn(),
}));

const renderHeader = () =>
  render(
    <MemoryRouter>
      <LandingHeader />
    </MemoryRouter>,
  );

describe('LandingHeader', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('서비스 메뉴와 로그인 링크를 보여준다', () => {
    fetchCurrentUser.mockRejectedValue(new Error('로그인이 필요합니다.'));

    renderHeader();

    expect(
      screen.getByRole('link', { name: 'Neverwatchlater' }),
    ).toHaveAttribute('href', '/');
    expect(
      screen.getByRole('link', { name: '서비스 소개' }),
    ).toHaveAttribute('href', '/#intro');
    expect(
      screen.getByRole('link', { name: '정리 목록' }),
    ).toHaveAttribute('href', '/videos');
    expect(
      screen.getByRole('link', { name: '재생목록 설정' }),
    ).toHaveAttribute('href', '/playlist-setup');
    expect(screen.getByRole('link', { name: '로그인' })).toHaveAttribute(
      'href',
      '/auth/loading',
    );
  });

  it('로그인되면 이름과 프로필 사진을 보여준다', async () => {
    fetchCurrentUser.mockResolvedValue({
      user: {
        name: '효주',
        picture: 'https://example.com/photo.png',
      },
    });

    const { container } = renderHeader();

    await waitFor(() => {
      expect(screen.getByText('효주')).toBeInTheDocument();
    });

    expect(container.querySelector('.nwl-account-photo')).toHaveAttribute(
      'src',
      'https://example.com/photo.png',
    );
    expect(screen.queryByRole('link', { name: '로그인' })).not.toBeInTheDocument();
  });

  it('햄버거 메뉴를 열면 모바일 메뉴 링크를 보여준다', () => {
    fetchCurrentUser.mockRejectedValue(new Error('로그인이 필요합니다.'));

    const { container } = renderHeader();

    fireEvent.click(container.querySelector('.nwl-header-menu'));

    expect(container.querySelector('.nwl-header-tray--open')).toBeTruthy();
    expect(container.querySelectorAll('.nwl-header-tray-link')).toHaveLength(3);
  });
});
