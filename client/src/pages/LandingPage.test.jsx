import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import LandingPage from './LandingPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  );

describe('LandingPage', () => {
  it('가이드형 히어로와 시작하기 링크를 보여준다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: '나중에 보긴 뭘 봐.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toHaveAttribute('href', '/auth/loading');
  });

  it('네 가지 정리 방법과 예시 카드를 보여준다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: '바로 보기' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '나중에' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '안볼래요' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '보관하기' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: '일의 본질을 다시 생각하는 시간',
      }),
    ).toBeInTheDocument();
  });
});
