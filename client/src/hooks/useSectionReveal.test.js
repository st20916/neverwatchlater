import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import useSectionReveal from './useSectionReveal';

const mockMatchMedia = (matches) => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

describe('useSectionReveal', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('IntersectionObserver가 없으면 바로 보여준다', () => {
    mockMatchMedia(false);
    const OriginalObserver = window.IntersectionObserver;
    window.IntersectionObserver = undefined;

    const root = document.createElement('div');
    const section = document.createElement('section');
    root.append(section);
    document.body.append(root);

    renderHook(() => useSectionReveal({ current: root }, ':scope > section'));

    expect(section.classList.contains('is-visible')).toBe(true);
    window.IntersectionObserver = OriginalObserver;
  });

  it('reduced motion이면 바로 보여준다', () => {
    mockMatchMedia(true);

    const root = document.createElement('div');
    const section = document.createElement('section');
    root.append(section);
    document.body.append(root);

    renderHook(() => useSectionReveal({ current: root }, ':scope > section'));

    expect(section.classList.contains('is-visible')).toBe(true);
  });

  it('섹션이 보이면 is-visible을 붙인다', () => {
    mockMatchMedia(false);
    let callback;
    window.IntersectionObserver = class {
      constructor(cb) {
        callback = cb;
      }

      observe() {}

      unobserve() {}

      disconnect() {}
    };

    const root = document.createElement('div');
    const section = document.createElement('section');
    root.append(section);
    document.body.append(root);

    renderHook(() => useSectionReveal({ current: root }, ':scope > section'));

    callback([
      {
        isIntersecting: true,
        target: section,
      },
    ]);

    expect(section.classList.contains('is-visible')).toBe(true);
  });
});
