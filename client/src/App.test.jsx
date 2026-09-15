import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';

describe('App', () => {
  it('기본 경로에서 랜딩 화면을 보여준다', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: '나중에 보긴 뭘 봐.' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Google 계정으로 시작하기' }),
    ).toBeInTheDocument();
  });

  it('가이드형 예시 카드를 보여준다', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: '일의 본질을 다시 생각하는 시간',
      }),
    ).toBeInTheDocument();
    expect(document.querySelectorAll('img')).toHaveLength(0);
  });
});
