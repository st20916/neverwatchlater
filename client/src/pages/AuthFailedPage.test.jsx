import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import AuthFailedPage from './AuthFailedPage.jsx';

const renderPage = (path = '/auth/failed') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/auth/failed" element={<AuthFailedPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('AuthFailedPage', () => {
  it('계정 연결 실패 단계와 재로그인 링크를 보여준다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Google 계정 연결에 실패했습니다',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('SETUP / ACCOUNT')).toBeInTheDocument();
    expect(screen.getByText('권한을 확인하고 다시 로그인해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('Google 계정 연결')).toBeInTheDocument();
    expect(screen.getByText('Google 계정을 연결하지 못했습니다')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(
      '알 수 없는 이유로 로그인이 중단되었습니다. 다시 시도해 주세요.',
    );
    expect(
      screen.getByRole('link', { name: '다시 로그인 시도' }),
    ).toHaveAttribute('href', '/auth/loading');
    expect(screen.queryByRole('button', { name: '계정 연결 실패' })).not.toBeInTheDocument();
  });

  it('oauth_denied 사유를 강조해 보여준다', () => {
    renderPage('/auth/failed?reason=oauth_denied');

    expect(screen.getByRole('alert')).toHaveTextContent(
      '권한 동의가 취소되었습니다',
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      '유튜브 재생목록 권한에 동의하지 않으면 서비스를 시작할 수 없습니다.',
    );
    expect(screen.queryByText('oauth_denied')).not.toBeInTheDocument();
  });

  it('알 수 없는 reason은 화면에 그대로 노출하지 않는다', () => {
    renderPage('/auth/failed?reason=not_a_real_code');

    expect(screen.queryByText('not_a_real_code')).not.toBeInTheDocument();
    expect(
      screen.getByText('Google 계정을 연결하지 못했습니다'),
    ).toBeInTheDocument();
  });
});
