import { useEffect, useLayoutEffect, useRef, useState, useId } from 'react';
import { createSelectionMotion, retargetSelection, stepSelection, selectionContour, selectionPath, selectionPresentation } from './renderer/selection-motion.js';
import { createJellyPalette } from './color.js';
import { MOTION } from './renderer/motion.js';
import { materialTargetColor } from './tokens.js';
import './selection-motion.css';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** Reusable decorative subsumption. Content/semantic state stays immediate. */
export function useJellyTransition(targetKey, { onFrame, onAssimilated, reducedMotion = false } = {}) {
  const stateRef = useRef(null), scheduleRef = useRef(() => {});
  const callbacks = useRef({ onFrame, onAssimilated, reducedMotion });
  callbacks.current = { onFrame, onAssimilated, reducedMotion };
  if (!stateRef.current) stateRef.current = createSelectionMotion({ x: 0, y: 0, width: 1, height: 1, cornerRadius: 0 }, targetKey);
  const [snapshot, setSnapshot] = useState(() => selectionPresentation(stateRef.current));
  useBrowserLayoutEffect(() => {
    const before = stateRef.current.currentKey;
    retargetSelection(stateRef.current, { x: 0, y: 0, width: 1, height: 1, cornerRadius: 0 }, targetKey, reducedMotion);
    if (reducedMotion && !Object.is(before, stateRef.current.currentKey)) {
      callbacks.current.onAssimilated?.(stateRef.current.currentKey);
      setSnapshot(selectionPresentation(stateRef.current));
    }
    scheduleRef.current();
  }, [targetKey, reducedMotion]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = performance.now(), alive = true;
    const schedule = () => { if (!frame && alive) { previous = performance.now(); frame = requestAnimationFrame(tick); } };
    const tick = timestamp => {
      frame = 0; if (!alive) return;
      const before = stateRef.current.currentKey;
      stepSelection(stateRef.current, Math.min(0.055, (timestamp - previous) / 1000), media.matches || callbacks.current.reducedMotion);
      previous = timestamp;
      const next = selectionPresentation(stateRef.current);
      callbacks.current.onFrame?.(next);
      if (!Object.is(before, next.visibleKey)) callbacks.current.onAssimilated?.(next.visibleKey);
      setSnapshot(prior => prior.phase === next.phase && Object.is(prior.visibleKey, next.visibleKey) && Object.is(prior.targetKey, next.targetKey) ? prior : next);
      if (stateRef.current.travelling) frame = requestAnimationFrame(tick);
    };
    scheduleRef.current = schedule; media.addEventListener('change', schedule); schedule();
    return () => { alive = false; cancelAnimationFrame(frame); media.removeEventListener('change', schedule); scheduleRef.current = () => {}; };
  }, []);
  return { phase: snapshot.phase, visibleKey: snapshot.visibleKey, targetKey: snapshot.targetKey, stateRef, getSnapshot: () => selectionPresentation(stateRef.current) };
}

/** One decorative contour; semantic selection stays in the caller's DOM. */
export function SelectionContour({ groupRef, selectedKey, selector = '[aria-checked="true"]', className = '', style }) {
  const svg = useRef(null), paths = useRef([]), motion = useRef(null);
  const reflectionId = `jb-reflection-${useId().replace(/:/g, '')}`;
  const current = useRef({ selectedKey, selector });
  const refresh = useRef(() => {});
  current.current = { selectedKey, selector };
  useBrowserLayoutEffect(() => { refresh.current(); }, [selectedKey, selector]);
  // Parent refs are attached by the passive phase, including first mounts in
  // a hidden route. A child layout effect can see a still-null parent ref.
  useEffect(() => {
    const group = groupRef.current, element = svg.current;
    if (!group || !element) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, previous = performance.now(), disposed = false, dirty = true;
    let targetHex = null, shownHex = null, palette = null, colorProgress = 1;
    const schedule = () => { dirty = true; if (!frame && !disposed) { previous = performance.now(); frame = requestAnimationFrame(draw); } };
    refresh.current = schedule;
    const measure = () => {
      const selected = group.querySelector(current.current.selector);
      if (!selected || selected.closest('[hidden], [inert]') || !selected.getClientRects().length) {
        if (element.style.visibility !== 'hidden') element.style.visibility = 'hidden'; motion.current = null; return;
      }
      const outer = group.getBoundingClientRect(), bounds = selected.getBoundingClientRect();
      const scaleX = outer.width / Math.max(group.offsetWidth, 1), scaleY = outer.height / Math.max(group.offsetHeight, 1);
      const rect = { x: (bounds.x - outer.x) / scaleX - group.clientLeft + group.scrollLeft,
        y: (bounds.y - outer.y) / scaleY - group.clientTop + group.scrollTop,
        width: bounds.width / scaleX, height: bounds.height / scaleY,
        cornerRadius: parseFloat(getComputedStyle(selected).borderTopLeftRadius) || 22 };
      const key = selected.dataset.gelKey ?? String(current.current.selectedKey);
      if (!motion.current) motion.current = createSelectionMotion(rect, key);
      else retargetSelection(motion.current, rect, key, media.matches || group.dataset.gelSelectionInstant === 'true');
      element.setAttribute('viewBox', `0 0 ${Math.max(group.clientWidth, 1)} ${Math.max(group.clientHeight, 1)}`);
      const nextHex = materialTargetColor(getComputedStyle(selected), selected.dataset.gelTone);
      if (nextHex !== targetHex) {
        palette = createJellyPalette(shownHex || nextHex, nextHex);
        targetHex = nextHex; colorProgress = 0;
      }
      if (element.style.visibility !== 'visible') element.style.visibility = 'visible';
    };
    function draw(timestamp) {
      frame = 0;
      if (disposed) return;
      if (dirty) { measure(); dirty = false; }
      const state = motion.current;
      if (!state) return;
      const dt = Math.max(0.001, Math.min(0.055, (timestamp - previous) / 1000));
      stepSelection(state, dt, media.matches || group.dataset.gelSelectionInstant === 'true');
      previous = timestamp;
      colorProgress = media.matches || group.dataset.gelSelectionInstant === 'true' ? 1 : Math.min(1, colorProgress + dt / (MOTION.pigment / 1000));
      shownHex = palette ? palette.sample(state.travelling ? state.colorProgress : colorProgress) : targetHex;
      if (shownHex && element.style.getPropertyValue('--jb-contour-color') !== shownHex) element.style.setProperty('--jb-contour-color', shownHex);
      element.dataset.selectionPhase = state.phase;
      element.dataset.selectionDepth = state.depth.toFixed(4);
      element.dataset.selectionMix = state.colorProgress.toFixed(4);
      const opacity = String(Number(state.density.toFixed(4)));
      const filter = state.phase === 'idle' ? 'none' : `blur(${((1 - Math.min(state.depth, 1)) * 1.4).toFixed(2)}px)`;
      if (element.style.opacity !== opacity) element.style.opacity = opacity;
      if (element.style.filter !== filter) element.style.filter = filter;
      if (group.dataset.gelSelectionRendered !== 'true') {
        const contour = selectionContour(state), span = 6 * (0.28 + Math.min(state.depth, 1) * 0.72);
        paths.current[0]?.setAttribute('d', selectionPath(contour, span / 2));
        paths.current[0]?.setAttribute('stroke-width', String(span));
        paths.current[1]?.setAttribute('d', selectionPath(contour, Math.max(0.5, span * 0.18)));
      }
      if (state.travelling || colorProgress < 1) frame = requestAnimationFrame(draw);
    }
    const resize = new ResizeObserver(schedule);
    resize.observe(group); group.querySelectorAll('[data-gel-option]').forEach(item => resize.observe(item));
    const mutations = new MutationObserver(records => {
      if (records.some(record => !element.contains(record.target))) schedule();
    });
    mutations.observe(group, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-checked', 'aria-selected', 'aria-pressed', 'hidden', 'inert', 'class', 'style', 'data-gel-selection-rendered', 'data-gel-selection-instant'] });
    window.addEventListener('scroll', schedule, { passive: true, capture: true });
    window.addEventListener('resize', schedule); media.addEventListener('change', schedule);
    schedule();
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); mutations.disconnect();
      window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule); refresh.current = () => {};
    };
  }, [groupRef]);
  return <svg ref={svg} className={`jb-selection-contour jb-selection-svg ${className}`} aria-hidden="true" focusable="false" style={{ visibility: 'hidden', ...style }}>
    <defs><linearGradient id={reflectionId} x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stopColor="white" stopOpacity=".9" /><stop offset=".55" stopColor="white" stopOpacity=".25" /><stop offset="1" stopColor="white" stopOpacity="0" /></linearGradient></defs>
    <path ref={node => { paths.current[0] = node; }} className="jb-contour-body" strokeWidth="6" />
    <path ref={node => { paths.current[1] = node; }} className="jb-contour-reflection" stroke={`url(#${reflectionId})`} />
  </svg>;
}
