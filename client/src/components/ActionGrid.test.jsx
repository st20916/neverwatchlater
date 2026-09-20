import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ActionGrid, { AUTO_ADVANCE_MS } from './ActionGrid.jsx';

const mockMatchMedia = (mobile) => {
  window.matchMedia = (query) => ({
    matches:
      query.includes('max-width: 760px') ? mobile : query.includes('prefers-reduced-motion')
        ? false
        : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
};

describe('ActionGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('데스크톱에서는 카드 4장을 함께 보여준다', () => {
    mockMatchMedia(false);
    render(<ActionGrid />);

    expect(screen.getByRole('heading', { name: '바로 보기' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '나중에' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '정리완료' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '보관하기' })).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '정리 방법' })).not.toBeInTheDocument();
  });

  it('모바일에서는 한 장씩 자동으로 다음 카드로 넘어간다', () => {
    mockMatchMedia(true);
    render(<ActionGrid />);

    expect(screen.getByRole('heading', { name: '바로 보기' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '나중에' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '바로 보기 1번째' })).toHaveAttribute(
      'aria-current',
      'true',
    );

    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_MS);
    });

    expect(screen.getByRole('heading', { name: '나중에' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '나중에 2번째' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('모바일에서 페이지네이션을 누르면 해당 카드로 이동한다', () => {
    mockMatchMedia(true);
    render(<ActionGrid />);

    fireEvent.click(screen.getByRole('button', { name: '보관하기 4번째' }));

    expect(screen.getByRole('heading', { name: '보관하기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '보관하기 4번째' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('마지막 카드 다음에는 첫 카드로 끊기지 않고 이어진다', () => {
    mockMatchMedia(true);
    render(<ActionGrid />);

    act(() => {
      vi.advanceTimersByTime(AUTO_ADVANCE_MS * 4);
    });
    act(() => {
      vi.advanceTimersByTime(520);
    });

    expect(screen.getByRole('heading', { name: '바로 보기' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '바로 보기 1번째' })).toHaveAttribute(
      'aria-current',
      'true',
    );
  });
});
