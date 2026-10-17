// Authored UI timings inspired by viscoelastic settling, not measured gelatin.
// See MOTION.md for the primary research and accessibility rationale.
export const MOTION = Object.freeze({
  expand: 460, collapse: 320, flow: 420, material: 240, feedback: 120, compress: 65, fade: 160, follow: 180,
  breathe: 5300, activityOrbit: 2500,
  activityResponse: Object.freeze({ frequency: 18, damping: .48 }),
  activityStrain: Object.freeze({ frequency: 14, damping: .45 }), skeleton: 1200, loadingPreview: 1800, recoil: 480, pigment: 480, tabTransfer: 760, windowOpen: 760, windowClose: 700, densityGather: 620, densityMelt: 560, sliderGather: 280, sliderMelt: 420, sliderGrace: 120, sliderTravel: 240, magnetRise: 140,
  arrival: 480, arrivalStagger: 55,
  sliderTravelCurve: 'cubic-bezier(.32,0,.2,1)',
  gather: 'cubic-bezier(.32,0,.2,1)',
  withdraw: 'cubic-bezier(.38,0,.24,1)',
  pigmentCurve: 'cubic-bezier(.22,0,.2,1)',
  spring: 'cubic-bezier(.22,1.12,.36,1)',
  squeeze: 'cubic-bezier(.32,0,.62,1)',
  recoilCurve: 'cubic-bezier(.18,1.48,.32,1)',
  settle: 'cubic-bezier(.22,1,.36,1)',
  effects: 'cubic-bezier(.2,0,0,1)',
});
export const motionStyle = {
  '--motion-expand': `${MOTION.expand}ms`, '--motion-collapse': `${MOTION.collapse}ms`,
  '--motion-flow': `${MOTION.flow}ms`,
  '--motion-density-gather': `${MOTION.densityGather}ms`, '--motion-density-melt': `${MOTION.densityMelt}ms`,
  '--ease-gather': MOTION.gather, '--ease-withdraw': MOTION.withdraw,
  '--motion-material': `${MOTION.material}ms`,
  '--motion-feedback': `${MOTION.feedback}ms`, '--motion-fade': `${MOTION.fade}ms`,
  '--motion-breathe': `${MOTION.breathe}ms`, '--motion-skeleton': `${MOTION.skeleton}ms`,
  '--ease-jelly': MOTION.spring, '--ease-settle': MOTION.settle, '--ease-effects': MOTION.effects,
};

// CSS and the optical surface sample the same authored response. Overshoot is
// spatial only: native values, text, opacity and pigment stay bounded.
const curves = new Map();
export function sampleBezier(curve, progress) {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  let points = curves.get(curve);
  if (!points) { points = curve.match(/-?\d*\.?\d+/g).map(Number); curves.set(curve, points); }
  const [x1, y1, x2, y2] = points;
  const at = (t, a, b) => 3 * (1 - t) ** 2 * t * a + 3 * (1 - t) * t * t * b + t ** 3;
  let low = 0, high = 1;
  for (let i = 0; i < 16; i++) { const mid = (low + high) / 2; if (at(mid, x1, x2) < progress) low = mid; else high = mid; }
  return at((low + high) / 2, y1, y2);
}

export function stepJellyResponse(body, key, target, delta, { duration = MOTION.recoil, curve = MOTION.recoilCurve, instant = false } = {}) {
  body.responses ||= {};
  let response = body.responses[key];
  if (!response || instant) response = body.responses[key] = { value: target, from: target, target, elapsed: duration };
  if (response.target !== target) { response.from = response.value; response.target = target; response.elapsed = 0; }
  response.elapsed = Math.min(duration, response.elapsed + Math.max(0, delta) * 1000);
  response.value = response.from + (target - response.from) * sampleBezier(curve, duration ? response.elapsed / duration : 1);
  return response.value;
}

// Acknowledge locally before leaning toward the pointer. The pointer direction
// stays live; this clock controls only the bounded attraction multiplier.
export function stepAttraction(body, active, delta, { disabled = false } = {}) {
  const stage = body.attraction ||= { age: 0, gain: 0, from: 0, release: 0, active: false };
  if (disabled) { Object.assign(stage, { age: 0, gain: 0, from: 0, release: 0, active: false }); return 0; }
  const ms = Math.max(0, delta) * 1000;
  if (active) {
    if (!stage.active) { stage.age = 0; stage.from = stage.gain; }
    stage.age += ms;
    stage.gain = stage.from + (1 - stage.from) * sampleBezier(MOTION.settle, Math.max(0, Math.min(1, (stage.age - MOTION.magnetRise) / MOTION.follow)));
  } else {
    if (stage.active) { stage.from = stage.gain; stage.release = 0; }
    stage.release = Math.min(MOTION.feedback, stage.release + ms);
    stage.gain = stage.from * (1 - sampleBezier(MOTION.settle, stage.release / MOTION.feedback));
  }
  stage.active = active;
  return stage.gain;
}
