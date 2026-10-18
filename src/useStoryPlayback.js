import { useCallback, useEffect, useRef, useState } from 'react';
import { createStoryPlaybackDriver } from './story-playback.js';

let sharedRuntime = null;

function acquireRuntime() {
  if (sharedRuntime) return sharedRuntime;
  const driver = createStoryPlaybackDriver();
  const controls = new Map();
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const environment = () => driver.setEnvironment({ awake: !document.hidden, reducedMotion: media.matches });
  // Any visible part can explain the figure. A percentage of a tall mobile
  // grid would otherwise leave its first/last visible chart frozen.
  const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(entries => {
    for (const entry of entries) controls.get(entry.target)?.update({ visible: entry.isIntersecting });
  }, { threshold: 0 });
  environment();
  document.addEventListener('visibilitychange', environment);
  media.addEventListener('change', environment);
  sharedRuntime = {
    attach(element, options) {
      const control = driver.register(options);
      controls.set(element, control);
      if (observer) observer.observe(element);
      else control.update({ visible: true });
      return {
        ...control,
        dispose() {
          observer?.unobserve(element);
          controls.delete(element);
          control.dispose();
          if (controls.size) return;
          observer?.disconnect();
          document.removeEventListener('visibilitychange', environment);
          media.removeEventListener('change', environment);
          driver.dispose();
          sharedRuntime = null;
        },
      };
    },
  };
  return sharedRuntime;
}

// Samples return primitives or shallow records of primitives. Equal samples
// retain the React tree; WAAPI-only consumers need no sampling timer at all.
export function useStoryPlayback(ref, { enabled = true, sample } = {}) {
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const stableSample = useRef((...args) => sampleRef.current?.(...args));
  const control = useRef(null);
  const [snapshot, setSnapshot] = useState(() => ({ running: false, staticMode: !enabled, elapsed: 0, value: sample?.(0, { staticMode: !enabled }) }));
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const current = acquireRuntime().attach(element, { enabled, sample: sampleRef.current ? stableSample.current : undefined, onChange: setSnapshot });
    control.current = current;
    return () => { control.current = null; current.dispose(); };
  }, [ref]);
  const sampled = Boolean(sample);
  useEffect(() => {
    control.current?.update({ enabled, sample: sampled ? stableSample.current : undefined });
  }, [enabled, sampled]);
  const getElapsed = useCallback(() => control.current?.getElapsed() ?? 0, []);
  return { ...snapshot, getElapsed };
}
