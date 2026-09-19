import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import useTypewriter from './useTypewriter';

const mockMatchMedia = (matches) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('useTypewriter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('reduced motion이면 전체 단어를 보여준다', () => {
    mockMatchMedia(true);

    const { result } = renderHook(() => useTypewriter('Neverwatchlater'));

    expect(result.current).toBe('Neverwatchlater');
  });

  it('한 글자씩 타이핑한다', () => {
    mockMatchMedia(false);

    const { result } = renderHook(() => useTypewriter('Neverwatchlater'));

    expect(result.current).toBe('');

    act(() => {
      vi.advanceTimersByTime(170);
    });

    expect(result.current).toBe('N');
  });
});
