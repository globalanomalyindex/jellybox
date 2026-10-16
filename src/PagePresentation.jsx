import { useLayoutEffect, useRef } from 'react';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';

const clamp = value => Math.max(0, Math.min(1, value));

// A one-time arrival. Layout and native targets never participate in the motion.
export function usePagePresentation(appRef, buttonRefs) {
  const edgeRef = useRef(null);
  const presentation = useRef({ arrival: [1, 1, 1], edgeHeight: 0 });

  useLayoutEffect(() => {
    const root = appRef.current, edge = edgeRef.current;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const forced = matchMedia('(forced-colors: active)');
    const transparent = matchMedia('(prefers-reduced-transparency: reduce)');
    let arrivalFrame = null, edgeFrame = null, settled = false;
    const start = performance.now();
    const paintArrival = (role, value) => root.style.setProperty(`--entry-${role}`, value);
    const finishArrival = () => {
      if (settled) return;
      settled = true;
      cancelAnimationFrame(arrivalFrame);
      ['header', 'identity', 'credits', 'story'].forEach(role => paintArrival(role, 1));
      presentation.current.arrival.fill(1);
      buttonRefs.current.forEach(el => el?.style.setProperty('--entry-opacity', 1));
      root.dataset.arrival = 'settled';
    };
    const arrive = now => {
      const age = now - start;
      const sample = (delay, duration = MOTION.arrival) => sampleBezier(MOTION.settle, clamp((age - delay) / duration));
      paintArrival('header', sample(0, MOTION.material));
      paintArrival('identity', sample(MOTION.fade / 2, MOTION.flow));
      paintArrival('credits', sample(MOTION.collapse));
      paintArrival('story', sample(MOTION.flow));
      presentation.current.arrival = [0, 1, 2].map(i => sample(MOTION.material - 40 + i * MOTION.arrivalStagger));
      buttonRefs.current.forEach((el, i) => el?.style.setProperty('--entry-opacity', presentation.current.arrival[i]));
      if (age >= MOTION.flow + MOTION.arrival) finishArrival();
      else arrivalFrame = requestAnimationFrame(arrive);
    };
    const updateEdge = () => {
      edgeFrame = null;
      const baseHeight = Math.max(72, Math.min(112, innerHeight * .12));
      const credits = root.querySelector('.story-authorship').getBoundingClientRect();
      // The opening screen's signature remains completely outside the blur.
      const creditClearance = credits.bottom > 0 && credits.top < innerHeight ? Math.max(0, innerHeight - credits.bottom - 16) : baseHeight;
      const height = Math.min(baseHeight, creditClearance);
      edge.style.height = `${height}px`;
      presentation.current.edgeHeight = height;
      const remaining = document.documentElement.scrollHeight - innerHeight - scrollY;
      const focused = document.activeElement;
      const bounds = focused?.matches('a, button, input, select, textarea, [tabindex]') ? focused.getBoundingClientRect() : null;
      const protectFocus = bounds && bounds.bottom > innerHeight - height - 12 && bounds.top < innerHeight;
      const selection = getSelection()?.isCollapsed === false;
      const t = clamp((remaining - 8) / Math.max(1, height));
      const strength = height < 12 || forced.matches || transparent.matches || protectFocus || selection ? 0 : t * t * (3 - 2 * t);
      edge.style.opacity = strength;
      edge.dataset.more = String(remaining > 8);
      edge.dataset.protected = String(Boolean(protectFocus || selection));
    };
    const scheduleEdge = () => { if (edgeFrame === null) edgeFrame = requestAnimationFrame(updateEdge); };
    const scroll = () => { if (scrollY > 0) finishArrival(); scheduleEdge(); };
    const preferences = () => { if (reduced.matches) finishArrival(); scheduleEdge(); };
    const observer = new ResizeObserver(scheduleEdge);
    observer.observe(root);
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scheduleEdge);
    document.addEventListener('focusin', finishArrival);
    document.addEventListener('pointerdown', finishArrival);
    document.addEventListener('focusin', scheduleEdge);
    document.addEventListener('focusout', scheduleEdge);
    document.addEventListener('selectionchange', scheduleEdge);
    document.addEventListener('visibilitychange', finishArrival);
    [reduced, forced, transparent].forEach(media => media.addEventListener('change', preferences));
    root.dataset.arrival = 'arriving';
    if (reduced.matches || forced.matches || scrollY > 0 || location.hash.startsWith('#story-')) finishArrival();
    else arrive(start);
    updateEdge();
    return () => {
      cancelAnimationFrame(arrivalFrame); cancelAnimationFrame(edgeFrame);
      observer.disconnect();
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scheduleEdge);
      document.removeEventListener('focusin', finishArrival);
      document.removeEventListener('pointerdown', finishArrival);
      document.removeEventListener('focusin', scheduleEdge);
      document.removeEventListener('focusout', scheduleEdge);
      document.removeEventListener('selectionchange', scheduleEdge);
      document.removeEventListener('visibilitychange', finishArrival);
      [reduced, forced, transparent].forEach(media => media.removeEventListener('change', preferences));
    };
  }, [appRef, buttonRefs]);

  return { edgeRef, presentation };
}

// Browser compositing keeps live DOM text selectable. The scene filters its own
// pixels separately with the same band height and opacity, in the same renderer.
export function ProgressiveScrollEdge({ edgeRef }) {
  // Three overlapping masks keep a continuous ramp without six compositor passes.
  const levels = [1, 4, 10];
  return <div className="scroll-edge" ref={edgeRef} aria-hidden="true">
    {levels.map((blur, i) => <div className="scroll-edge-layer" key={blur} style={{
      backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
      maskImage: `linear-gradient(to bottom, transparent ${Math.max(0, (i - 1) * 100 / levels.length)}%, black ${(i + 1) * 100 / levels.length}%)`,
      WebkitMaskImage: `linear-gradient(to bottom, transparent ${Math.max(0, (i - 1) * 100 / levels.length)}%, black ${(i + 1) * 100 / levels.length}%)`,
    }} />)}
  </div>;
}
