// A bounded lens inside the continuous dropdown body. Geometry is evaluated per
// fragment so its curved normals remain smooth even on a wide, sparse shell.
export const POCKET = Object.freeze({ depth: 12, travelFrequency: 24, travelDamping: .66, shapeFrequency: 30, shapeDamping: .48 });
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function pocketProfile(x, y, width, height) {
  const radius = Math.max(1, height / 2);
  const segment = Math.max(0, width / 2 - radius);
  const capX = Math.max(0, Math.abs(x) - segment) * Math.sign(x);
  const r2 = (capX * capX + y * y) / (radius * radius);
  if (r2 >= 1) return { height: 0, pigment: 0, dx: 0, dy: 0 };
  const t = 1 - r2, slope = -2.5 * Math.pow(t, .25) / (radius * radius);
  return { height: Math.pow(t, 1.25), pigment: Math.min(1, t / .24) ** 2 * (3 - 2 * Math.min(1, t / .24)), dx: slope * capX, dy: slope * y };
}

// Matches pocketProfile: xy are the analytic height gradient, z is height,
// w is pigment. Finite support and a zero-slope seam avoid a blurry color wash.
export const POCKET_GLSL = `
vec4 jellyPocket(vec2 point, vec4 region) {
  float radius = max(1.0, region.w * .5);
  float segment = max(0.0, region.z * .5 - radius);
  vec2 p = point - region.xy;
  vec2 cap = vec2(max(0.0, abs(p.x) - segment) * sign(p.x), p.y);
  float t = max(0.0, 1.0 - dot(cap, cap) / (radius * radius));
  float slope = -2.5 * pow(t, .25) / (radius * radius);
  return vec4(cap * slope, pow(t, 1.25), smoothstep(0.0, .24, t));
}
`;

function spring(value, velocity, target, seconds, frequency, damping) {
  // Exact underdamped solution: independent of refresh rate and retains velocity
  // during a new input, unlike restarting a CSS curve from rest each time.
  const decay = damping * frequency, wd = frequency * Math.sqrt(1 - damping * damping);
  const offset = value - target, b = (velocity + decay * offset) / wd;
  const e = Math.exp(-decay * seconds), c = Math.cos(wd * seconds), s = Math.sin(wd * seconds);
  return [target + e * (offset * c + b * s), e * ((b * wd - decay * offset) * c - (offset * wd + decay * b) * s)];
}
export function stepPocket(previous, target, seconds, instant = false) {
  if (!previous || instant) return { ...target, target: { ...target }, vx: 0, vy: 0, vw: 0, vh: 0, strain: 0, strainVelocity: 0 };
  const state = previous;
  state.target = { ...target };
  const dt = clamp(seconds, 0, .1);
  if (!dt) return state;
  for (const [key, velocity] of [['x', 'vx'], ['y', 'vy'], ['width', 'vw'], ['height', 'vh']]) {
    [state[key], state[velocity]] = spring(state[key], state[velocity], target[key], dt, POCKET.travelFrequency, POCKET.travelDamping);
  }
  const pull = clamp(Math.abs(state.vy) / 650, 0, 1) * .095;
  [state.strain, state.strainVelocity] = spring(state.strain, state.strainVelocity, pull, dt, POCKET.shapeFrequency, POCKET.shapeDamping);
  state.strain = clamp(state.strain, -.035, .12);
  return state;
}
export function pocketShape(state) {
  // Approximately preserve area as the moving mass stretches and gathers again.
  const stretch = 1 + state.strain;
  return { x: state.x, y: state.y, width: state.width / stretch, height: state.height * stretch };
}
