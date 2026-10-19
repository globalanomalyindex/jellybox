import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createJellyPalette, normalizeJellyColor } from './color.js';
import { MOTION, sampleBezier } from './renderer/motion.js';
import { controlPigment, toneStyle } from './tokens.js';
import { inkStyle } from './contrast.js';
import { useMaterialPigment } from './MaterialContext.js';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
/** Animate only a surface pigment. Semantic labels, state, and focus stay immediate. */
export function useJellyColor(target, { duration = MOTION.pigment, disabled = false, origin, onSample } = {}) {
  const destination = normalizeJellyColor(target);
  const milliseconds = Number.isFinite(duration) ? Math.max(0, duration) : MOTION.pigment;
  const [frameSample, setFrameSample] = useState(() => ({ color: origin ? normalizeJellyColor(origin.color) : destination, progress: 1 }));
  const color = frameSample.color;
  const current = useRef(color), previousOrigin = useRef(origin);
  const sample = useRef(onSample);
  sample.current = onSample;
  // A new captured origin transfers ownership from another visible surface.
  // Keep this object stable until the next handoff; ordinary retargets retain
  // the current sample rather than starting again from the captured origin.
  const handedOff = origin && origin !== previousOrigin.current;
  const firstColor = handedOff ? normalizeJellyColor(origin.color) : color;

  useBrowserLayoutEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    let frame = null;
    let stopped = false;
    const cancel = () => { if (frame !== null) window.cancelAnimationFrame(frame); frame = null; };
    const publish = (next, progress = 1) => { current.current = next; setFrameSample({ color: next, progress }); };
    if (origin !== previousOrigin.current) {
      previousOrigin.current = origin;
      if (origin) publish(normalizeJellyColor(origin.color));
    }
    const snap = () => { cancel(); publish(destination); };
    const motionChange = () => { if (media.matches) snap(); };
    media?.addEventListener?.('change', motionChange);

    if (disabled || milliseconds === 0 || media?.matches || typeof window.requestAnimationFrame !== 'function' || current.current === destination) snap();
    else {
      const palette = createJellyPalette(current.current, destination);
      const started = performance.now();
      publish(current.current, 0);
      const tick = (time) => {
        if (stopped) return;
        const progress = Math.min(1, Math.max(0, (time - started) / milliseconds));
        const displayed = sampleBezier(MOTION.pigmentCurve, progress);
        publish(progress === 1 ? destination : palette.sample(displayed), displayed);
        frame = progress < 1 ? window.requestAnimationFrame(tick) : null;
      };
      frame = window.requestAnimationFrame(tick);
    }
    return () => {
      stopped = true;
      cancel();
      media?.removeEventListener?.('change', motionChange);
    };
  }, [destination, milliseconds, disabled, origin]);

  // Publish gathering only after the same pigment sample has reached the DOM.
  // A renderer frame must never see a new phase with the previous color.
  useBrowserLayoutEffect(() => { sample.current?.(frameSample.progress); }, [frameSample]);

  return disabled || milliseconds === 0 ? destination : firstColor;
}

/** Keep target ink immediate while only the two decorative pigment variables flow. */
export function useJellyToneStyle(tone = 'action', options) {
  const target = toneStyle(tone);
  const pigment = useMaterialPigment(tone);
  const color = useJellyColor(pigment ?? target['--jb-color'], options);
  return {
    ...target,
    ...inkStyle(color),
    '--jb-color': color,
    '--jb-target-color': pigment ?? target['--jb-color'],
    '--jb-rgb': [1, 3, 5].map((start) => parseInt(color.slice(start, start + 2), 16)).join(' '),
  };
}

/** Same sampled pigment feeds the optical body and fallback, with immediate semantic state. */
export function useJellyControlStyle(tone, state, pigment, options) {
  const accent = useMaterialPigment(tone, pigment);
  const target = controlPigment(tone, state, accent);
  const color = useJellyColor(target, options);
  return { ...toneStyle(tone), ...inkStyle(color), '--jb-color': color, '--jb-target-color': target,
    '--jb-rgb': [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16)).join(' ') };
}
