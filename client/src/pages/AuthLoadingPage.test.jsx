import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getGoogleLoginUrl } from '../api/authApi';
import AuthLoadingPage from './AuthLoadingPage.jsx';

vi.mock('../api/authApi', () => ({
  getGoogleLoginUrl: vi.fn(() => 'http://localhost:4000/api/auth/google'),
  fetchCurrentUser: vi.fn(),
}));

describe('AuthLoadingPage', () => {
  const assign = vi.fn();

  beforeEach(() => {
    assign.mockReset();
    getGoogleLoginUrl.mockClear();
    vi.stubGlobal('location', { assign });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('계정 연동 진행 화면을 보여주고 Google 로그인을 시작한다', () => {
    render(
      <MemoryRouter>
        <AuthLoadingPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Google 계정을 연동하고 있습니다',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('list', { name: '설정 진행 단계' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Google 계정 정보를 확인하고 있습니다'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('navigation', { name: '프로토타입 이동' }),
    ).not.toBeInTheDocument();
    expect(assign).toHaveBeenCalledWith('http://localhost:4000/api/auth/google');
  });
});
