import { useCallback, useEffect, useRef, useState } from 'react';

const MOBILE_QUERY = '(max-width: 760px)';
const AUTO_ADVANCE_MS = 4200;
const SWIPE_THRESHOLD = 48;

const ACTION_CARDS = [
  {
    id: '01',
    tone: 'alert',
    english: 'WATCH & CLEAN',
    title: '바로 보기',
    body: 'YouTube를 새 탭으로 열고, 전용 재생목록과 서비스 목록에서 영상을 정리해요.',
  },
  {
    id: '02',
    tone: 'accent',
    english: 'RESET THE CLOCK',
    title: '나중에',
    body: '목록에는 그대로 두고 저장 기준일만 오늘로 되돌려요. 방치 경고도 사라져요.',
  },
  {
    id: '03',
    tone: 'alert',
    english: 'LET IT GO',
    title: '안볼래요',
    body: '확인 후 전용 재생목록과 서비스 목록에서 삭제해요.',
  },
  {
    id: '04',
    tone: 'accent',
    english: 'KEEP, QUIETLY',
    title: '보관하기',
    body: '영상은 남겨두고 D-Day 방치 경고만 멈춰요. 나중에 다시 꺼내볼 수 있어요.',
  },
];

const ArrowUpRight = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h10v10" />
    <path d="M7 17 17 7" />
  </svg>
);

const getMatches = (query) =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia(query).matches;

const ActionCard = ({ card, inert = false }) => (
  <article
    className={`guide-action-card guide-action-card--${card.tone}`}
    aria-hidden={inert || undefined}
  >
    <div className="action-top">
      <span>{card.id}</span>
      <ArrowUpRight />
    </div>
    <p className="action-english">{card.english}</p>
    <h3>{card.title}</h3>
    <p>{card.body}</p>
  </article>
);

const ActionGrid = () => {
  const count = ACTION_CARDS.length;
  const slides = [
    ACTION_CARDS[count - 1],
    ...ACTION_CARDS,
    ACTION_CARDS[0],
  ];
  const [isMobile, setIsMobile] = useState(() => getMatches(MOBILE_QUERY));
  const [index, setIndex] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [dragX, setDragX] = useState(0);
  const [paused, setPaused] = useState(false);
  const [prefersReduced, setPrefersReduced] = useState(() =>
    getMatches('(prefers-reduced-motion: reduce)'),
  );
  const pointerRef = useRef({
    active: false,
    id: null,
    startX: 0,
    startY: 0,
    axis: null,
  });

  const realIndex = ((index - 1 + count) % count + count) % count;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mobile = window.matchMedia(MOBILE_QUERY);
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncMobile = () => {
      setIsMobile(mobile.matches);
      setIndex(1);
      setDragX(0);
      setAnimate(true);
    };
    const syncMotion = () => setPrefersReduced(motion.matches);

    syncMobile();
    syncMotion();
    mobile.addEventListener('change', syncMobile);
    motion.addEventListener('change', syncMotion);
    return () => {
      mobile.removeEventListener('change', syncMobile);
      motion.removeEventListener('change', syncMotion);
    };
  }, []);

  const step = useCallback((delta) => {
    setAnimate(true);
    setDragX(0);
    setIndex((current) => current + delta);
  }, []);

  const goToReal = (nextReal) => {
    setAnimate(true);
    setDragX(0);
    setIndex(nextReal + 1);
  };

  useEffect(() => {
    if (!isMobile || paused || prefersReduced) {
      return undefined;
    }

    const timer = window.setInterval(() => step(1), AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [isMobile, paused, prefersReduced, step, index]);

  useEffect(() => {
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const settleLoop = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (index === 0) {
      setAnimate(false);
      setIndex(count);
      return;
    }

    if (index === count + 1) {
      setAnimate(false);
      setIndex(1);
    }
  };

  useEffect(() => {
    if (index !== 0 && index !== count + 1) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      if (index === 0) {
        setAnimate(false);
        setIndex(count);
        return;
      }

      setAnimate(false);
      setIndex(1);
    }, 520);

    return () => window.clearTimeout(timer);
  }, [count, index]);

  useEffect(() => {
    if (animate) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setAnimate(true));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [animate, index]);

  const onPointerDown = (event) => {
    if (!isMobile || event.button !== 0) {
      return;
    }

    pointerRef.current = {
      active: true,
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      axis: null,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setPaused(true);
    setAnimate(false);
  };

  const onPointerMove = (event) => {
    const pointer = pointerRef.current;
    if (!pointer.active || pointer.id !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - pointer.startX;
    const deltaY = event.clientY - pointer.startY;

    if (!pointer.axis) {
      if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) {
        return;
      }

      pointer.axis = Math.abs(deltaX) > Math.abs(deltaY) ? 'x' : 'y';
    }

    if (pointer.axis !== 'x') {
      return;
    }

    event.preventDefault();
    setDragX(deltaX);
  };

  const onPointerUp = (event) => {
    const pointer = pointerRef.current;
    if (!pointer.active || pointer.id !== event.pointerId) {
      return;
    }

    pointer.active = false;
    const deltaX = dragX;
    setPaused(false);

    if (pointer.axis === 'x' && Math.abs(deltaX) >= SWIPE_THRESHOLD) {
      step(deltaX < 0 ? 1 : -1);
      return;
    }

    setAnimate(true);
    setDragX(0);
  };

  if (!isMobile) {
    return (
      <div className="action-grid">
        {ACTION_CARDS.map((card) => (
          <ActionCard key={card.id} card={card} />
        ))}
      </div>
    );
  }

  const offset = `calc(${-index * 100}% + ${dragX}px)`;

  return (
    <div className="action-grid action-grid--carousel">
      <div
        className="action-grid__viewport"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className={
            animate
              ? 'action-grid__track'
              : 'action-grid__track action-grid__track--instant'
          }
          style={{ transform: `translate3d(${offset}, 0, 0)` }}
          onTransitionEnd={settleLoop}
        >
          {slides.map((card, slideIndex) => (
            <div className="action-grid__slide" key={`${card.id}-${slideIndex}`}>
              <ActionCard
                card={card}
                inert={slideIndex !== index}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="action-grid__dots" role="group" aria-label="정리 방법">
        {ACTION_CARDS.map((card, cardIndex) => {
          const current = cardIndex === realIndex;

          return (
            <button
              key={card.id}
              type="button"
              className={
                current
                  ? 'action-grid__dot action-grid__dot--current'
                  : 'action-grid__dot'
              }
              aria-label={`${card.title} ${cardIndex + 1}번째`}
              aria-current={current ? 'true' : undefined}
              onClick={() => goToReal(cardIndex)}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ActionGrid;
export { ACTION_CARDS, AUTO_ADVANCE_MS };
