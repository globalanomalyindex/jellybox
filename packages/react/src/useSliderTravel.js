import { useEffect, useLayoutEffect, useRef } from 'react';
import { rangePointValue, rangeTravelValue, rangeDragValue } from './interaction.js';
import { MOTION } from './renderer/motion.js';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const TRACE = import.meta.env?.DEV === true;

// Opt-in rail clicks change the actual value over one clock. The native input,
// number, fill, rendered bulb and consumer callbacks all receive the same sample.
export function useSliderTravel({ inputRef, enabled, disabled, value, min, max, step, form, commit, onDirect }) {
  const animation = useRef(null), pointer = useRef(null), frame = useRef(0), writing = useRef(false);
  const latest = useRef(null);
  latest.current = { enabled, disabled, min, max, step, commit, onDirect };

  const trace = (active, elapsed, state, reason) => {
    if (!TRACE || !active || !inputRef.current) return;
    const input = inputRef.current;
    if (elapsed !== null) {
      active.samples ||= [];
      if (active.samples.length >= 24) active.samples.splice(1, 1);
      active.samples.push([Math.round(elapsed * 10) / 10, input.valueAsNumber]);
      input.dataset.jellyTravelSamples = JSON.stringify(active.samples);
    }
    if (state) input.dataset.jellyTravelState = state;
    if (reason) input.dataset.jellyTravelStop = reason;
  };
  const stop = (reason = 'cancelled') => {
    trace(animation.current, null, reason === 'complete' ? 'complete' : 'cancelled', reason);
    cancelAnimationFrame(frame.current); frame.current = 0; animation.current = null;
  };
  const release = () => {
    const gesture = pointer.current; pointer.current = null;
    const input = inputRef.current;
    if (gesture && input?.hasPointerCapture?.(gesture.id)) input.releasePointerCapture(gesture.id);
  };
  const cancel = reason => { stop(reason); release(); };
  const bounds = () => {
    const input = inputRef.current, rect = input.getBoundingClientRect(), state = latest.current;
    return { left: rect.left, width: rect.width, min: Number(state.min), max: Number(state.max), step: state.step, rtl: getComputedStyle(input).direction === 'rtl' };
  };
  const write = next => {
    if (pointer.current) pointer.current.emitted = next;
    writing.current = true;
    try { latest.current.commit(next); } finally { writing.current = false; }
  };
  const allowed = () => {
    const input = inputRef.current, state = latest.current;
    return state.enabled && !state.disabled && input?.isConnected && !input.disabled && !input.closest('[inert]') && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };
  const tick = now => {
    const active = animation.current, input = inputRef.current;
    if (!active) return;
    // A consumer may reject/clamp a controlled sample, or update the native
    // field directly. Respect its current value instead of fighting it.
    if (!allowed() || input.valueAsNumber !== active.emitted) { cancel(allowed() ? 'external-value' : 'inactive'); return; }
    const elapsed = Math.max(0, now - active.started);
    const next = rangeTravelValue(active.from, active.to, elapsed, active.range);
    active.emitted = next;
    write(next);
    trace(active, elapsed);
    if (animation.current !== active) return;
    if (elapsed >= MOTION.sliderTravel) stop('complete');
    else frame.current = requestAnimationFrame(tick);
  };

  useBrowserLayoutEffect(() => {
    if (value === undefined) return;
    const expected = animation.current?.emitted ?? (pointer.current?.direct ? pointer.current.emitted : undefined);
    if (expected !== undefined && Number(value) !== expected) cancel('external-value');
  }, [value]);
  useBrowserLayoutEffect(() => { cancel('configuration'); }, [enabled, disabled, min, max, step]);
  useEffect(() => {
    const input = inputRef.current, owner = input?.form, media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const reset = () => cancel('reset');
    const blur = () => cancel('blur'), resize = () => cancel('resize');
    const reduce = () => { if (media.matches) cancel('reduced-motion'); };
    owner?.addEventListener('reset', reset); media.addEventListener('change', reduce);
    window.addEventListener('blur', blur); window.addEventListener('resize', resize);
    return () => {
      cancel('unmount'); owner?.removeEventListener('reset', reset); media.removeEventListener('change', reduce);
      window.removeEventListener('blur', blur); window.removeEventListener('resize', resize);
    };
  }, [form]);

  return {
    cancel,
    nativeChange() { if (!writing.current) cancel('native-input'); },
    keyDown(event) {
      const origin = pointer.current?.origin ?? animation.current?.from;
      const expected = animation.current?.emitted ?? pointer.current?.emitted;
      const restore = event.key === 'Escape' && origin !== undefined && allowed() && inputRef.current.valueAsNumber === expected;
      cancel(restore ? 'escape' : 'keyboard');
      if (restore) { event.preventDefault(); event.stopPropagation(); write(origin); return true; }
      return false;
    },
    pointerDown(event) {
      if (event.button !== 0 || event.isPrimary === false || !allowed()) { cancel('inactive'); return false; }
      const input = inputRef.current, range = bounds(), from = input.valueAsNumber;
      if (!(range.max > range.min)) return false;
      const fraction = (from - range.min) / (range.max - range.min);
      const center = range.left + 14 + (range.width - 28) * (range.rtl ? 1 - fraction : fraction);
      if (Math.abs(event.clientX - center) <= 14) { cancel('direct'); return false; }
      const to = rangePointValue(event.clientX, range);
      if (to === from) { cancel('same-value'); return false; }
      cancel('retarget'); event.preventDefault(); input.focus({ preventScroll: true });
      pointer.current = { id: event.pointerId, x: event.clientX, origin: from, emitted: from, direct: false };
      input.setPointerCapture(event.pointerId);
      animation.current = { from, to, emitted: from, range, started: performance.now() };
      if (TRACE) { input.dataset.jellyTravelTarget = String(to); delete input.dataset.jellyTravelStop; }
      trace(animation.current, 0, 'running');
      frame.current = requestAnimationFrame(tick);
      return true;
    },
    pointerMove(event) {
      const gesture = pointer.current;
      if (!gesture || gesture.id !== event.pointerId) return;
      if (!allowed()) { cancel('inactive'); return; }
      if (gesture.direct && inputRef.current.valueAsNumber !== gesture.emitted) { cancel('external-value'); return; }
      if (!gesture.direct && Math.abs(event.clientX - gesture.x) < 3) return;
      if (!gesture.direct) {
        // Stop at the accepted sample and re-anchor here. The first deliberate
        // move must not teleport to the far rail point that began the click.
        stop('direct'); gesture.direct = true;
        gesture.anchorX = event.clientX; gesture.anchorValue = inputRef.current.valueAsNumber;
        gesture.emitted = gesture.anchorValue;
        latest.current.onDirect?.(); return;
      }
      write(rangeDragValue(gesture.anchorValue, event.clientX - gesture.anchorX, bounds()));
    },
    pointerUp(event) { if (pointer.current?.id === event.pointerId) release(); },
    pointerCancel(event) {
      if (pointer.current?.id !== event.pointerId) return;
      const origin = pointer.current.origin, restore = allowed() && inputRef.current.valueAsNumber === pointer.current.emitted;
      cancel('pointer-cancel'); if (restore) write(origin);
    },
    lostCapture(event) { if (pointer.current?.id === event.pointerId) cancel('capture-lost'); },
  };
}
