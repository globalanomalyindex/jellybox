import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';

// The response plays at its actual speed, rests, then returns on a gentler arc.
export function motionLoopFrames({ duration, curve }, period = 0) {
  const hold = MOTION.recoil, returnTime = MOTION.recoil, rest = MOTION.fade;
  const total = Math.max(duration + hold + returnTime + rest, period);
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

export function densityStorySample(elapsed, { staticMode = false } = {}) {
  const gathered = staticMode || Math.max(0, elapsed) % MOTION.breathe >= MOTION.breathe / 2;
  return gathered ? { strength: 100, label: 'Gathered structure' } : { strength: 45, label: 'Open film' };
}

export function colorStorySample(elapsed, { staticMode = false } = {}) {
  const stage = staticMode ? 1 : Math.floor(Math.max(0, elapsed) / 2500) % 4;
  return { joined: stage > 0, pending: stage === 2, mix: stage > 1 ? 75 : 50,
    label: ['Separate pigments', 'Shared identity', 'Edit preview', 'Accepted pigment'][stage] };
}
