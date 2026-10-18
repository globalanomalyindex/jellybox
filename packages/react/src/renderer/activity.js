import { createJellyPalette } from '../color.js';
import { MOTION, sampleBezier } from './motion.js';
const clamp = value => Math.max(0, Math.min(1, value));
const smooth = (low, high, value) => { const t = clamp((value - low) / (high - low)); return t * t * (3 - 2 * t); };
export const ACTIVITY_VOLUME = Object.freeze({ depth: 6.8, strength: .86, inset: 1.8, pull: 7.5, bulge: 1.1, recoil: 4.2 });
const outcome = status => ['success', 'warning', 'error'].includes(status);
const bell = (start, peak, end, value) => smooth(start, peak, value) * (1 - smooth(peak, end, value));

// Density gathers on the displayed pigment sample. A short, authored release
// travels through the shoulders after capture: compression, softer return,
// then one diminishing ripple. It never spring-scales the native capsule.
function gatheringStrain(progress) {
  return .46 * bell(0, .22, .43, progress)
    - .12 * bell(.25, .53, .78, progress)
    + .025 * bell(.62, .81, 1, progress);
}
export function stepActivity(previous, status = 'idle', materialPhase, seconds, { instant = false, moving = true } = {}) {
  const targetGain = status === 'loading' || outcome(status) ? 1 : 0;
  const targetGather = outcome(status) ? 1 : 0;
  const targetDensity = outcome(status) ? 1 : status === 'loading' ? .4 : 0;
  const state = previous || { status, gain: targetGain, gather: targetGather, density: targetDensity,
    gainVelocity: 0, gatherVelocity: 0, densityVelocity: 0, strain: 0, strainVelocity: 0,
    fromGain: targetGain, fromGather: targetGather, fromDensity: targetDensity,
    fromGainVelocity: 0, fromGatherVelocity: 0, fromDensityVelocity: 0,
    fromStrain: 0, fromStrainVelocity: 0, capture: 0,
    phase: 0, clock: 0, elapsed: MOTION.activitySettle, sample: 1 };
  const dt = Math.max(0, Math.min(.1, seconds));
  if (state.status !== status || Number.isFinite(materialPhase) && materialPhase + .0001 < state.sample) {
    state.fromGain = state.gain; state.fromGather = state.gather; state.fromDensity = state.density;
    state.fromGainVelocity = state.gainVelocity; state.fromGatherVelocity = state.gatherVelocity; state.fromDensityVelocity = state.densityVelocity;
    state.fromStrain = state.strain; state.fromStrainVelocity = state.strainVelocity;
    state.capture = outcome(status) ? clamp(1 - state.gather) * state.gain : 0;
    state.status = status; state.elapsed = 0;
  }
  state.elapsed = instant ? MOTION.activitySettle : Math.min(MOTION.activitySettle, state.elapsed + dt * 1000);
  const progress = instant ? 1 : Number.isFinite(materialPhase) ? clamp(materialPhase) : sampleBezier(MOTION.pigmentCurve, Math.min(1, state.elapsed / MOTION.pigment));
  const elapsed = Math.min(MOTION.pigment, state.elapsed) / 1000, previousGather = state.gather;
  for (const [key, target, from] of [['gain', targetGain, state.fromGain], ['gather', targetGather, state.fromGather], ['density', targetDensity, state.fromDensity]]) {
    const displayed = state[key];
    // A vanishing continuation keeps the last displayed momentum on a retry or
    // cancel. It is zero for ordinary capture and at the exact pigment endpoint.
    const carry = state[`from${key[0].toUpperCase()}${key.slice(1)}Velocity`] * elapsed * (1 - progress) ** 2;
    state[key] = instant ? target : clamp(from + (target - from) * progress + carry);
    if (dt > 0) state[`${key}Velocity`] = (state[key] - displayed) / dt;
    if (progress === 1) state[`${key}Velocity`] = 0;
  }
  state.sample = progress;
  const beforeStrain = state.strain, age = state.elapsed / MOTION.activitySettle;
  const remaining = 1 - smooth(0, 1, age);
  const carriedStrain = (state.fromStrain + state.fromStrainVelocity * state.elapsed / 1000 * (1 - age)) * remaining;
  state.strain = instant ? 0 : Math.max(-.24, Math.min(.85, carriedStrain + gatheringStrain(age) * state.capture));
  if (dt > 0) state.strainVelocity = (state.strain - beforeStrain) / dt;
  if (state.elapsed === MOTION.activitySettle) state.strain = state.strainVelocity = 0;
  state.energy = clamp(state.gain);
  state.settling = progress < 1 || state.elapsed < MOTION.activitySettle
    && (Math.abs(state.strain) > .0001 || state.capture > .0001 || Math.abs(state.fromStrain) > .0001 || Math.abs(state.fromStrainVelocity) > .001);
  if (moving && !instant) {
    state.clock += dt;
    // The current keeps turning as it collects, slowing with its own gather.
    state.phase += dt * Math.PI * 2 / (MOTION.activityOrbit / 1000) * (1 - state.gather)
      + (state.gather - previousGather) * 2.2;
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
  const orbitX = Math.cos(shape.phase) * .62, orbitY = Math.sin(shape.phase) * .46;
  const lead = Math.exp(-(((nx - orbitX) / .42) ** 2) - ((ny - orbitY) / .48) ** 2);
  const trail = Math.exp(-(((nx + orbitX) / .42) ** 2) - ((ny + orbitY) / .48) ** 2);
  const bulk = (.32 + fold * (.10 - reading * .05) + (lead * .32 + trail * .22) * (1 - reading * .25)) * shape.breath;
  const q = shape.gather, squeeze = 4 * q * (1 - q);
  // Opposed density lobes sweep in from the ends and collect at the shoulders.
  // Their slopes bend light; the broad crown retains the gathered volume.
  const travel = .76 * (1 - q), arc = .42 + Math.sin(shape.phase) * .12 * (1 - q);
  const top = Math.exp(-(((nx - travel) / .38) ** 2) - ((ny - arc) / .28) ** 2);
  const bottom = Math.exp(-(((nx + travel) / .38) ** 2) - ((ny + arc) / .28) ** 2);
  const crown = .84 - .10 * nx * nx;
  const shoulder = Math.exp(-(((Math.abs(nx) - (.74 - .28 * q)) / .28) ** 2));
  const ripple = shoulder * (1 - reading * .88) * (1 + Math.sin(shape.phase + nx * 2.4) * .22);
  return (bulk * (1 - q) + crown * q + (top + bottom) * squeeze * .58 + shape.strain * ripple * .42) * support;
}

export function activityContour(shape) {
  return { inset: ACTIVITY_VOLUME.inset * shape.gather + ACTIVITY_VOLUME.pull * shape.strain,
    bulge: ACTIVITY_VOLUME.bulge * shape.gather + ACTIVITY_VOLUME.recoil * shape.strain };
}
export function activityDisplacement(x, y, shape, output = {}) {
  const nx = x / Math.max(1, shape.width * .5), ny = y / Math.max(1, shape.height * .5);
  const movement = shape.gain * (1 - shape.gather);
  const shoulder = smooth(.18, .85, Math.abs(nx));
  const traveling = .82 + .18 * Math.sin(shape.phase + nx * 2.4 + ny * .8);
  const inset = ACTIVITY_VOLUME.inset * shape.gather + ACTIVITY_VOLUME.pull * shape.strain * traveling;
  const bulge = ACTIVITY_VOLUME.bulge * shape.gather + ACTIVITY_VOLUME.recoil * shape.strain * traveling;
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
  vec2 orbit = vec2(cos(shape.z) * .62, sin(shape.z) * .46);
  vec2 leadQ = (p-orbit)/vec2(.42,.48), trailQ = (p+orbit)/vec2(.42,.48);
  float lead = exp(-dot(leadQ,leadQ)), trail = exp(-dot(trailQ,trailQ));
  float bulk = (.32 + fold * (.10-reading*.05) + (lead*.32+trail*.22)*(1.0-reading*.25)) * shape.w;
  float squeeze = 4.0 * gather * (1.0 - gather);
  float travel = .76 * (1.0 - gather), arc = .42 + sin(shape.z) * .12 * (1.0 - gather);
  vec2 topQ = (p-vec2(travel,arc))/vec2(.38,.28);
  vec2 bottomQ = (p+vec2(travel,arc))/vec2(.38,.28);
  float top = exp(-dot(topQ,topQ));
  float bottom = exp(-dot(bottomQ,bottomQ));
  float crown = .84 - .10 * p.x * p.x;
  float shoulderQ = (abs(p.x)-(.74-.28*gather))/.28;
  float shoulder = exp(-shoulderQ*shoulderQ);
  float ripple = shoulder * (1.0-reading*.88) * (1.0+sin(shape.z+p.x*2.4)*.22);
  return (mix(bulk,crown,gather) + (top+bottom)*squeeze*.58 + uActivityStrain*ripple*.42) * support;
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

// Two concentrations retain the circulating material's color identity. The
// host's one eased phase samples both cached Spectral paths; spatial relief
// blends them in the shader. No palette is reconstructed for a frame sample.
export function activityPigment(previous, status, destination, progress) {
  const target = status === 'loading' ? '#1459d1' : destination;
  const filmTarget = status === 'loading' ? destination : target;
  const state = previous || { color: target, film: filmTarget, target, filmTarget, status, sample: 1,
    palette: createJellyPalette(target, target), filmPalette: createJellyPalette(filmTarget, filmTarget),
    denseRGB: [0, 0, 0] };
  if (state.status !== status || state.target !== target || state.filmTarget !== filmTarget || progress + .0001 < state.sample) {
    state.palette = createJellyPalette(state.color, target);
    state.filmPalette = createJellyPalette(state.film, filmTarget);
    state.status = status; state.target = target; state.filmTarget = filmTarget;
  }
  state.sample = clamp(progress);
  const filmPhase = activityPigmentPhase(state.sample, .15), densePhase = activityPigmentPhase(state.sample, .85);
  state.color = state.palette.sample(densePhase);
  state.film = state.filmPalette.sample(filmPhase);
  state.palette.sampleRGB(densePhase, state.denseRGB);
  return state;
}

// The film/current paths converge at the result, so a settling highlight cannot
// reintroduce loading blue. Text remains a native, stationary layer above it.
// Film waits while the dense current collects the result. Both paths still
// use the one host clock, and capture their exact displayed colors on retarget.
export function activityPigmentPhase(progress, concentration) {
  const p = clamp(progress);
  return clamp(p + (clamp(concentration) - .5) * 1.35 * 4 * p * (1 - p));
}

export const ACTIVITY_PIGMENT_GLSL = `
uniform sampler2D uActivityPalette;
uniform float uActivityPigmentPhase;
uniform vec3 uActivityFallbackDense;
float jellyActivityPigmentPhase(float progress, float concentration) {
  float p = clamp(progress, 0.0, 1.0);
  return clamp(p + (clamp(concentration, 0.0, 1.0) - .5) * 1.35 * 4.0 * p * (1.0 - p), 0.0, 1.0);
}
vec3 jellyActivityPigment(vec3 filmColor, float concentration) {
  if (uActivityPigmentPhase < 0.0) return mix(filmColor, uActivityFallbackDense, clamp(concentration, 0.0, 1.0));
  float filmX = (jellyActivityPigmentPhase(uActivityPigmentPhase, .15) * 32.0 + .5) / 33.0;
  float currentX = (jellyActivityPigmentPhase(uActivityPigmentPhase, .85) * 32.0 + .5) / 33.0;
  vec3 film = texture2D(uActivityPalette, vec2(filmX, .25)).rgb;
  vec3 current = texture2D(uActivityPalette, vec2(currentX, .75)).rgb;
  return mix(film, current, clamp(concentration, 0.0, 1.0));
}
`;
