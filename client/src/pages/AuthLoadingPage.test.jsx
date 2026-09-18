import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AuthLoadingPage from './AuthLoadingPage.jsx';

describe('AuthLoadingPage', () => {
  it('계정 연동 진행 화면과 프로토타입 이동 링크를 보여준다', () => {
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
      screen.getByRole('link', { name: '인증 성공 화면 보기' }),
    ).toHaveAttribute('href', '/playlist-setup');
    expect(
      screen.getByRole('link', { name: '인증 실패 화면 보기' }),
    ).toHaveAttribute('href', '/auth/failed');
    expect(
      screen.queryByRole('button', { name: '연동 진행 중' }),
    ).not.toBeInTheDocument();
  });
});
