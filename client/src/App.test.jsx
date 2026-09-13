import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('기본 경로에서 랜딩 화면을 보여준다', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'Neverwatchlater' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toBeInTheDocument();
  });

  it('이미지 영역을 회색 플레이스홀더로 표시한다', () => {
    render(<App />);

    expect(
      screen.getByRole('img', { name: '서비스 대표 이미지 영역' }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
