import { JELLY_MATERIAL } from './material.js';

const shoulder = JELLY_MATERIAL.control.densityShoulder;
const clamp = value => Math.max(0, Math.min(1, value));
const zero = output => Object.assign(output, { height: 0, dx: 0, dy: 0, concentration: 0 });
const curve = (start, end, value) => { const t = clamp((value - start) / (end - start)); return t * t * (3 - 2 * t); };
const slope = (start, end, value) => { const t = clamp((value - start) / (end - start)); return 6 * t * (1 - t) / (end - start); };

// These compact surfaces share material with the main volumes, but need a
// filled concentration to remain discoverable when the adjustable lamp is off.
// Activity and header handoffs keep their own recently authored cross-sections.
export function controlDensityRole(kind, { activity, headerControl } = {}) {
  return !activity && !headerControl && ['control', 'option', 'badge', 'thumb'].includes(kind);
}

export function controlDensityField(x, y, { width, height, radius, amount }, output = {}) {
  if (amount <= 0) return zero(output);
  const r = Math.max(.001, Math.min(radius, width / 2, height / 2));
  const qx = Math.abs(x) - Math.max(0, width / 2 - r), qy = Math.abs(y) - Math.max(0, height / 2 - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0), length = Math.hypot(ox, oy);
  const distance = r - length - Math.min(Math.max(qx, qy), 0);
  const span = Math.max(shoulder.minimumSpan, Math.min(shoulder.maximumSpan, Math.min(width, height) * .18));
  if (distance <= 0 || distance >= span) return zero(output);
  const rise = curve(0, span * .36, distance), fall = 1 - curve(span * .36, span, distance);
  const concentration = Math.min(shoulder.maximum, Math.max(0, amount)) * rise * fall;
  const derivative = Math.min(shoulder.maximum, Math.max(0, amount))
    * (slope(0, span * .36, distance) * fall - rise * slope(span * .36, span, distance));
  const nx = (length ? ox / length : qx > qy ? 1 : 0) * Math.sign(x);
  const ny = (length ? oy / length : qy >= qx ? 1 : 0) * Math.sign(y);
  output.height = concentration * shoulder.relief;
  output.dx = -nx * derivative * shoulder.relief;
  output.dy = -ny * derivative * shoulder.relief;
  output.concentration = concentration;
  return output;
}

// Small label-free thumbs need a minimum path through their finite shoulder;
// a relative attenuation multiplier alone washes out at high transparency.
// Larger controls and all text-bearing roles keep the established policy.
export function controlDensityPathFloor(concentration, shortSide, kind = 'thumb') {
  if (kind !== 'thumb') return 0;
  const small = 1 - curve(shoulder.smallControlFullSpan, shoulder.smallControlSpan, shortSide);
  return Math.min(shoulder.maximum, Math.max(0, concentration)) * shoulder.smallControlPath * small;
}

// The same finite shoulder supplies mesh relief, optical slope and absorption.
// No independently colored ring, extra surface or elapsed time is involved.
export const CONTROL_DENSITY_GLSL = `
uniform vec4 uControlDensity;
uniform float uControlDensityThumb;
float jellyControlDensityPath(float concentration) {
  float small = 1.0-smoothstep(${shoulder.smallControlFullSpan.toFixed(1)},${shoulder.smallControlSpan.toFixed(1)},min(uControlDensity.x,uControlDensity.y));
  return clamp(concentration,0.0,${shoulder.maximum.toFixed(2)})*${shoulder.smallControlPath.toFixed(1)}*small*uControlDensityThumb;
}
float jellyControlDensitySlope(float start, float end, float value) {
  float t = clamp((value-start)/(end-start),0.0,1.0);
  return 6.0*t*(1.0-t)/(end-start);
}
vec4 jellyControlDensity(vec2 point) {
  if (uControlDensity.w <= .00001) return vec4(0.0);
  float r = max(.001,min(uControlDensity.z,min(uControlDensity.x,uControlDensity.y)*.5));
  vec2 q = abs(point)-max(vec2(0.0),uControlDensity.xy*.5-r);
  vec2 outside = max(q,vec2(0.0));
  float len = length(outside);
  float distance = r-len-min(max(q.x,q.y),0.0);
  float span = clamp(min(uControlDensity.x,uControlDensity.y)*.18,${shoulder.minimumSpan.toFixed(1)},${shoulder.maximumSpan.toFixed(1)});
  if (distance <= 0.0 || distance >= span) return vec4(0.0);
  float rise = smoothstep(0.0,span*.36,distance), fall = 1.0-smoothstep(span*.36,span,distance);
  float gain = clamp(uControlDensity.w,0.0,${shoulder.maximum.toFixed(2)});
  float concentration = gain*rise*fall;
  float derivative = gain*(jellyControlDensitySlope(0.0,span*.36,distance)*fall-rise*jellyControlDensitySlope(span*.36,span,distance));
  vec2 n = (len > .00001 ? outside/len : (q.x > q.y ? vec2(1.0,0.0) : vec2(0.0,1.0)))*sign(point);
  return vec4(-n*derivative*${shoulder.relief.toFixed(2)},concentration*${shoulder.relief.toFixed(2)},concentration);
}
`;
