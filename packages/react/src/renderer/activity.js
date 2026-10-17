import { MOTION, sampleBezier } from './motion.js';
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (low, high, value) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t); };
const outcome = status => ['success', 'warning', 'error'].includes(status);

// The host's already-eased pigment sample is also the gathering phase. This
// clock owns only circulation, never a second color transition or task outcome.
export function stepActivity(previous, status = 'idle', materialPhase, seconds, { instant = false, moving = true } = {}) {
  const targetGain = status === 'loading' ? 1 : 0;
  const targetGather = outcome(status) ? 1 : 0;
  const targetDensity = outcome(status) ? 1 : status === 'loading' ? .4 : 0;
  const state = previous || { status, gain: targetGain, gather: targetGather, density: targetDensity,
    fromGain: targetGain, fromGather: targetGather, fromDensity: targetDensity, phase: 0, clock: 0, elapsed: MOTION.pigment, sample: 1 };
  const dt = Math.max(0, Math.min(.1, seconds));
  if (state.status !== status || Number.isFinite(materialPhase) && materialPhase + .0001 < state.sample) {
    state.fromGain = state.gain; state.fromGather = state.gather; state.fromDensity = state.density;
    state.status = status; state.elapsed = 0;
  }
  state.elapsed = Math.min(MOTION.pigment, state.elapsed + dt * 1000);
  const progress = instant ? 1 : Number.isFinite(materialPhase) ? clamp(materialPhase) : sampleBezier(MOTION.pigmentCurve, state.elapsed / MOTION.pigment);
  state.gain = state.fromGain + (targetGain - state.fromGain) * progress;
  state.gather = state.fromGather + (targetGather - state.fromGather) * progress;
  state.density = state.fromDensity + (targetDensity - state.fromDensity) * progress;
  state.sample = progress;
  if (moving && !instant) {
    state.clock += dt;
    state.phase += dt * Math.PI * 2 / (MOTION.activityOrbit / 1000) * (1 - state.gather) * state.gain;
  }
  return state;
}

// Activity describes ongoing work; measured completion belongs to the native
// percentage and progress rail. Both modes use the same full-body circulation.
export function activityPocket(width, height, seconds, options = {}) {
  return { x: 0, y: 0, width, height, color: [.08, .35, .82],
    phase: options.phase ?? seconds * Math.PI * 2 / (MOTION.activityOrbit / 1000), gather: options.gather ?? 0, gain: options.gain ?? 1,
    breath: .88 + .12 * Math.sin(seconds * Math.PI * 2 / (MOTION.breathe / 1000)) };
}

// Same capsule support/current field in the mesh and fragment material. A quiet
// reading plateau keeps moving highlights away from the native lettering.
export function activityRelief(x, y, shape) {
  const halfY = Math.max(1, shape.height * .5), segment = Math.max(0, shape.width * .5 - halfY);
  const inside = halfY - Math.hypot(Math.max(0, Math.abs(x) - segment), y);
  const support = smooth(0, Math.min(4, halfY * .24), inside);
  const nx = x / Math.max(1, shape.width * .5), ny = y / halfY;
  const curl = Math.sin(nx * 2.2 - shape.phase) * .55 + ny * 1.1;
  const current = Math.sin(nx * 3.8 - shape.phase + curl);
  const returning = Math.cos(nx * 2.6 + shape.phase - ny * 3.2);
  const fold = current * .72 + returning * .28;
  const reading = 1 - smooth(.12, .55, Math.abs(ny));
  const bulk = (.5 + fold * (.24 - reading * .17)) * shape.breath;
  return (bulk + (.58 - bulk) * shape.gather) * support;
}

export function activityDisplacement(x, y, shape, output = {}) {
  const nx = x / Math.max(1, shape.width * .5), ny = y / Math.max(1, shape.height * .5);
  const movement = shape.gain * (1 - shape.gather);
  output.x = Math.cos(shape.phase + ny * 1.8) * .45 * nx * movement;
  output.y = Math.sin(shape.phase - nx * 3.1) * 1.15 * ny * movement;
  output.z = activityRelief(x, y, shape) * shape.gain * 1.8;
  return output;
}

export const ACTIVITY_GLSL = `
float jellyActivityHeight(vec2 point, vec4 shape, float gather) {
  vec2 p = point / max(vec2(1.0), shape.xy * .5);
  float halfY = max(1.0, shape.y * .5), segment = max(0.0, shape.x * .5 - halfY);
  float inside = halfY - length(vec2(max(0.0, abs(point.x) - segment), point.y));
  float support = smoothstep(0.0, min(4.0, halfY * .24), inside);
  float curl = sin(p.x * 2.2 - shape.z) * .55 + p.y * 1.1;
  float current = sin(p.x * 3.8 - shape.z + curl);
  float returning = cos(p.x * 2.6 + shape.z - p.y * 3.2);
  float fold = current * .72 + returning * .28;
  float reading = 1.0 - smoothstep(.12, .55, abs(p.y));
  float bulk = (.5 + fold * (.24 - reading * .17)) * shape.w;
  return mix(bulk, .58, gather) * support;
}
vec4 jellyActivity(vec2 point, vec4 shape, float gather) {
  float h = jellyActivityHeight(point, shape, gather);
  float e = .45;
  vec2 gradient = vec2(
    jellyActivityHeight(point + vec2(e, 0.0), shape, gather) - jellyActivityHeight(point - vec2(e, 0.0), shape, gather),
    jellyActivityHeight(point + vec2(0.0, e), shape, gather) - jellyActivityHeight(point - vec2(0.0, e), shape, gather)) / (2.0 * e);
  return vec4(gradient, h, smoothstep(0.0, .85, h));
}
`;
