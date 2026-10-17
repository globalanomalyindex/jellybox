import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';

// The response plays at its actual speed, rests, then returns on a gentler arc.
export function motionLoopFrames({ duration, curve }) {
  const hold = MOTION.recoil, returnTime = MOTION.recoil, rest = MOTION.fade;
  const total = duration + hold + returnTime + rest;
  const frames = Array.from({ length: 81 }, (_, index) => {
    const time = index / 80;
    const value = sampleBezier(curve, time);
    const before = sampleBezier(curve, Math.max(0, time - .01)), after = sampleBezier(curve, Math.min(1, time + .01));
    return { offset: time * duration / total, time, value, strain: Math.min(.15, Math.abs(after - before) * 2.4) };
  });
  // Travel and optical strain share these samples. The label/targets never scale.
  for (let index = 1; index <= 40; index++) {
    const t = index / 40;
    frames.push({ offset: (duration + hold * t) / total, time: 1, value: 1, strain: Math.sin(t * Math.PI * 4) * Math.exp(-t * 5) * .16 });
  }
  for (let index = 1; index <= 60; index++) {
    const time = 1 - sampleBezier(MOTION.settle, index / 60);
    frames.push({ offset: (duration + hold + returnTime * index / 60) / total, time, value: sampleBezier(curve, time), strain: -Math.sin(index / 60 * Math.PI) * .08 });
  }
  frames[0].strain = frames[80].strain = 0;
  frames.push({ offset: 1, time: 0, value: 0, strain: 0 });
  return { frames, duration: total };
}

export function colorGroupState(draft, committed) {
  const dirty = !committed || draft.pair !== committed.pair || draft.mix !== committed.mix;
  return { dirty, joined: Boolean(committed), label: !committed ? 'Separate · preview' : dirty ? 'Joined · changes pending' : 'Joined · 2 items' };
}

export function taskSample(elapsed, outcome, duration = 2400) {
  const progress = Math.max(0, Math.min(100, elapsed / duration * 100));
  return { progress, status: progress < 100 ? 'loading' : ['success', 'warning', 'error'].includes(outcome) ? outcome : 'error' };
}
