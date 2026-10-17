import { createJellyPalette } from '../color.js';
import { MOTION, sampleBezier } from './motion.js';
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (low, high, value) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t); };
export const ACTIVITY_VOLUME = Object.freeze({ depth: 4.8, strength: .86, inset: 1.8, pull: 12, bulge: 1.2, recoil: 6.5 });
const outcome = status => ['success', 'warning', 'error'].includes(status);

// Pigment remains on the host's 480 ms sample. One damped material response
// follows that sample; its retained velocity carries the last compression into
// a small recoil. This changes geometry/light, never task timing or native text.
const RESPONSE = MOTION.activityResponse;
function settle(state, key, target, dt, instant, response = RESPONSE) {
  const velocity = `${key}Velocity`;
  if (instant) { state[key] = target; state[velocity] = 0; return; }
  const steps = Math.max(1, Math.ceil(dt * 120)), h = dt / steps;
  for (let i = 0; i < steps; i++) {
    state[velocity] += (response.frequency ** 2 * (target - state[key])
      - 2 * response.damping * response.frequency * state[velocity]) * h;
    state[key] += state[velocity] * h;
  }
  if (Math.abs(state[key] - target) < .001 && Math.abs(state[velocity]) < .01) {
    state[key] = target; state[velocity] = 0;
  }
}
export function stepActivity(previous, status = 'idle', materialPhase, seconds, { instant = false, moving = true } = {}) {
  const targetGain = status === 'loading' || outcome(status) ? 1 : 0;
  const targetGather = outcome(status) ? 1 : 0;
  const targetDensity = outcome(status) ? 1 : status === 'loading' ? .4 : 0;
  const state = previous || { status, gain: targetGain, gather: targetGather, density: targetDensity,
    gainVelocity: 0, gatherVelocity: 0, densityVelocity: 0, strain: 0, strainVelocity: 0,
    fromGain: targetGain, fromGather: targetGather, fromDensity: targetDensity, phase: 0, clock: 0, elapsed: MOTION.pigment, sample: 1 };
  const dt = Math.max(0, Math.min(.1, seconds));
  if (state.status !== status || Number.isFinite(materialPhase) && materialPhase + .0001 < state.sample) {
    if (state.status !== status && outcome(status) && state.status === 'loading' && !instant) state.strainVelocity += Math.max(0, state.gain) * 7;
    state.fromGain = state.gain; state.fromGather = state.gather; state.fromDensity = state.density;
    state.status = status; state.elapsed = 0;
  }
  state.elapsed = Math.min(MOTION.pigment, state.elapsed + dt * 1000);
  const progress = instant ? 1 : Number.isFinite(materialPhase) ? clamp(materialPhase) : sampleBezier(MOTION.pigmentCurve, state.elapsed / MOTION.pigment);
  for (const [key, target, from] of [['gain', targetGain, state.fromGain], ['gather', targetGather, state.fromGather], ['density', targetDensity, state.fromDensity]]) {
    settle(state, key, from + (target - from) * progress, dt, instant);
  }
  state.sample = progress;
  settle(state, 'strain', state.gatherVelocity * .12, dt, instant, MOTION.activityStrain);
  state.strain = Math.max(-.24, Math.min(.85, state.strain));
  state.energy = clamp(state.gain);
  state.settling = Math.abs(state.gather - targetGather) > .0003 || Math.abs(state.gatherVelocity) > .003
    || Math.abs(state.gain - targetGain) > .0003 || Math.abs(state.gainVelocity) > .003 || Math.abs(state.strain) > .0003 || Math.abs(state.strainVelocity) > .003;
  if (moving && !instant) {
    state.clock += dt;
    // Avoid multiplying two vanishing envelopes: the last current continues
    // turning as it concentrates, then stops with the material's momentum.
    state.phase += dt * Math.PI * 2 / (MOTION.activityOrbit / 1000) * Math.max(0, 1 - clamp(state.gather));
  }
  return state;
}

// Activity describes ongoing work; measured completion belongs to the native
// percentage and progress rail. Both modes use the same full-body circulation.
export function activityPocket(width, height, seconds, options = {}) {
  return { x: 0, y: 0, width, height, color: [.08, .35, .82],
    phase: options.phase ?? seconds * Math.PI * 2 / (MOTION.activityOrbit / 1000), gather: clamp(options.gather ?? 0), gain: options.energy ?? options.gain ?? 1, strain: options.strain ?? 0,
    breath: (.88 + .12 * Math.sin(seconds * Math.PI * 2 / (MOTION.breathe / 1000))) * (1 - clamp(options.gather ?? 0)) + clamp(options.gather ?? 0) };
}

// Same capsule support/current field in the mesh and fragment material. A quiet
// reading plateau keeps moving highlights away from the native lettering.
export function activityRelief(x, y, shape) {
  const halfY = Math.max(1, shape.height * .5), segment = Math.max(0, shape.width * .5 - halfY);
  const inside = halfY - Math.hypot(Math.max(0, Math.abs(x) - segment), y);
  const support = smooth(0, Math.min(4, halfY * .24), inside);
  const nx = x / Math.max(1, shape.width * .5), ny = y / halfY;
  const inward = nx * (1 + shape.gather * .65);
  const curl = Math.sin(inward * 2.2 - shape.phase) * .55 + ny * 1.1;
  const current = Math.sin(inward * 3.8 - shape.phase + curl);
  const returning = Math.cos(inward * 2.6 + shape.phase - ny * 3.2);
  const fold = current * .72 + returning * .28;
  const reading = 1 - smooth(.12, .55, Math.abs(ny));
  const bulk = (.5 + fold * (.24 - reading * .17)) * shape.breath;
  const q = shape.gather, squeeze = 4 * q * (1 - q);
  // Opposed density lobes sweep in from the ends and collect at the shoulders.
  // Their slopes bend light; the broad crown retains the gathered volume.
  const travel = .76 * (1 - q), arc = .42 + Math.sin(shape.phase) * .12 * (1 - q);
  const top = Math.exp(-(((nx - travel) / .38) ** 2) - ((ny - arc) / .28) ** 2);
  const bottom = Math.exp(-(((nx + travel) / .38) ** 2) - ((ny + arc) / .28) ** 2);
  const crown = .84 - .10 * nx * nx;
  return (bulk * (1 - q) + crown * q + (top + bottom) * squeeze * .58 + shape.strain * .20) * support;
}

export function activityContour(shape) {
  return { inset: ACTIVITY_VOLUME.inset * shape.gather + ACTIVITY_VOLUME.pull * shape.strain,
    bulge: ACTIVITY_VOLUME.bulge * shape.gather + ACTIVITY_VOLUME.recoil * shape.strain };
}
export function activityDisplacement(x, y, shape, output = {}) {
  const nx = x / Math.max(1, shape.width * .5), ny = y / Math.max(1, shape.height * .5);
  const movement = shape.gain * (1 - shape.gather);
  const shoulder = smooth(.18, .85, Math.abs(nx));
  const inset = ACTIVITY_VOLUME.inset * shape.gather + ACTIVITY_VOLUME.pull * shape.strain;
  const bulge = ACTIVITY_VOLUME.bulge * shape.gather + ACTIVITY_VOLUME.recoil * shape.strain;
  output.x = Math.cos(shape.phase + ny * 1.8) * .45 * nx * movement - nx * shoulder * inset;
  output.y = Math.sin(shape.phase - nx * 3.1) * 1.15 * ny * movement + ny * (1 - Math.abs(nx) * .35) * bulge;
  output.z = activityRelief(x, y, shape) * shape.gain * ACTIVITY_VOLUME.depth * ACTIVITY_VOLUME.strength;
  return output;
}

export const ACTIVITY_GLSL = `
uniform float uActivityStrain;
float jellyActivityHeight(vec2 point, vec4 shape, float gather) {
  vec2 p = point / max(vec2(1.0), shape.xy * .5);
  float halfY = max(1.0, shape.y * .5), segment = max(0.0, shape.x * .5 - halfY);
  float inside = halfY - length(vec2(max(0.0, abs(point.x) - segment), point.y));
  float support = smoothstep(0.0, min(4.0, halfY * .24), inside);
  float inward = p.x * (1.0 + gather * .65);
  float curl = sin(inward * 2.2 - shape.z) * .55 + p.y * 1.1;
  float current = sin(inward * 3.8 - shape.z + curl);
  float returning = cos(inward * 2.6 + shape.z - p.y * 3.2);
  float fold = current * .72 + returning * .28;
  float reading = 1.0 - smoothstep(.12, .55, abs(p.y));
  float bulk = (.5 + fold * (.24 - reading * .17)) * shape.w;
  float squeeze = 4.0 * gather * (1.0 - gather);
  float travel = .76 * (1.0 - gather), arc = .42 + sin(shape.z) * .12 * (1.0 - gather);
  vec2 topQ = (p-vec2(travel,arc))/vec2(.38,.28);
  vec2 bottomQ = (p+vec2(travel,arc))/vec2(.38,.28);
  float top = exp(-dot(topQ,topQ));
  float bottom = exp(-dot(bottomQ,bottomQ));
  float crown = .84 - .10 * p.x * p.x;
  return (mix(bulk,crown,gather) + (top+bottom)*squeeze*.58 + uActivityStrain*.20) * support;
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

// The current's pigment follows the host sample too. Capturing its displayed
// endpoint on retarget avoids a blue flash during an outcome's spatial recoil.
export function activityPigment(previous, status, destination, progress) {
  const target = status === 'loading' ? '#1459d1' : destination;
  const state = previous || { color: target, target, status, sample: 1, palette: null };
  if (state.status !== status || state.target !== target || progress + .0001 < state.sample) {
    state.palette = createJellyPalette(state.color, target); state.status = status; state.target = target;
  }
  state.sample = clamp(progress);
  state.color = state.palette ? state.palette.sample(state.sample) : target;
  return state;
}
