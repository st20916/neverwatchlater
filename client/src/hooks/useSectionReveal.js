import { useEffect } from 'react';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

const useSectionReveal = (rootRef, selector) => {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return undefined;
    }

    const targets = selector ? [...root.querySelectorAll(selector)] : [root];
    if (targets.length === 0) {
      return undefined;
    }

    const showAll = () => {
      targets.forEach((el) => el.classList.add('is-visible'));
    };

    const prefersReduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia(REDUCED_MOTION).matches;

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      showAll();
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.14,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [rootRef, selector]);
};

export default useSectionReveal;
