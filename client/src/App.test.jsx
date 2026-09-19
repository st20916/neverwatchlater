import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import App from './App';

vi.mock('./api/authApi', () => ({
  fetchCurrentUser: vi.fn(() =>
    Promise.reject(new Error('로그인이 필요합니다.')),
  ),
}));

describe('App', () => {
  it('기본 경로에서 메인페이지를 보여준다', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Neverwatchlater' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Neverwatchlater' }),
    ).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '로그인' })).toBeInTheDocument();
  });

  it('메인페이지 아래에 서비스 소개를 이어 보여준다', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: '쌓여만 가는 재생목록 영상들' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toBeInTheDocument();
  });
});
