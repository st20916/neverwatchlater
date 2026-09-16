import { useEffect, useMemo, useState } from 'react';

const TYPEWRITER = {
  initialPause: 2200,
  initialSpeed: 170,
  backtrackPause: 260,
  retypePause: 1700,
  retypeSpeed: 185,
  clearSpeed: 145,
};

const buildTypingLoop = (word) => {
  const steps = [];

  for (let index = 0; index <= word.length; index += 1) {
    steps.push({
      value: word.slice(0, index),
      delay: index === word.length ? TYPEWRITER.initialPause : TYPEWRITER.initialSpeed,
    });
  }

  for (let index = word.length - 1; index >= word.length - 4; index -= 1) {
    steps.push({ value: word.slice(0, index), delay: TYPEWRITER.backtrackPause });
  }

  for (let index = word.length - 3; index <= word.length; index += 1) {
    steps.push({
      value: word.slice(0, index),
      delay: index === word.length ? TYPEWRITER.retypePause : TYPEWRITER.retypeSpeed,
    });
  }

  for (let index = word.length - 1; index >= 0; index -= 1) {
    steps.push({ value: word.slice(0, index), delay: TYPEWRITER.clearSpeed });
  }

  return steps;
};

const getReducedMotionPreference = () => {
  if (typeof window.matchMedia !== 'function') {
    return false;
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(getReducedMotionPreference);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setReducedMotion(mediaQuery.matches);

    updatePreference();
    mediaQuery.addEventListener('change', updatePreference);
    return () => mediaQuery.removeEventListener('change', updatePreference);
  }, []);

  return reducedMotion;
};

const useTypewriter = (word) => {
  const steps = useMemo(() => buildTypingLoop(word), [word]);
  const reducedMotion = useReducedMotion();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setStepIndex((current) => (current + 1) % steps.length);
    }, steps[stepIndex].delay);

    return () => window.clearTimeout(timer);
  }, [reducedMotion, stepIndex, steps]);

  return reducedMotion ? word : steps[stepIndex].value;
};

export default useTypewriter;
