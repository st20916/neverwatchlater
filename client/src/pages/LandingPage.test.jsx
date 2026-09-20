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
  it('메인페이지 제목과 소개 카피를 보여준다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 1, name: 'Neverwatchlater' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Clear your saved list/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', {
        name: '문서가 담긴 상자',
      }),
    ).toBeInTheDocument();
  });

  it('스크롤 아래 서비스 소개와 시작하기 링크를 보여준다', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { name: '쌓여만 가는 재생목록 영상들' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toHaveAttribute('href', '/auth/loading');
    expect(screen.getByRole('heading', { name: '바로 보기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '나중에' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '정리완료' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '보관하기' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '일의 본질을 다시 생각하는 시간' }),
    ).toBeInTheDocument();
    expect(screen.getByText('D+08')).toBeInTheDocument();
  });
});
