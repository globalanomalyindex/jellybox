import { MOTION } from './motion.js';

// Activity describes ongoing work; measured completion belongs to the native
// percentage and progress rail. Both modes use the same full-body circulation.
export function activityPocket(width, height, seconds) {
  return { x: 0, y: 0, width, height, color: [.08, .35, .82],
    phase: seconds * Math.PI * 2 / (MOTION.activityOrbit / 1000),
    breath: .88 + .12 * Math.sin(seconds * Math.PI * 2 / (MOTION.breathe / 1000)) };
}

// Two broad lobes twist through the same volume. The field changes absorption,
// thickness and optical normals together; it is not a moving painted stripe.
// Finite differences are local to active loading surfaces, not another pass.
export const ACTIVITY_GLSL = `
float jellyActivityHeight(vec2 point, vec4 shape) {
  vec2 p = point / max(vec2(1.0), shape.xy * .5);
  float radius2 = dot(p, p);
  float twist = shape.z + (1.0 - radius2) * 3.2;
  float c = cos(twist), s = sin(twist);
  vec2 q = mat2(c, -s, s, c) * p;
  vec2 a = (q - vec2(.34, .04)) / vec2(.72, .52);
  vec2 b = (q + vec2(.38, .06)) / vec2(.60, .56);
  float first = pow(max(0.0, 1.0 - dot(a, a)), 1.6);
  float second = pow(max(0.0, 1.0 - dot(b, b)), 1.6);
  float edge = 1.0 - smoothstep(.76, 1.02, radius2);
  return clamp((first + second * .8) * edge * shape.w, 0.0, 1.0);
}
vec4 jellyActivity(vec2 point, vec4 shape) {
  float h = jellyActivityHeight(point, shape);
  float e = .45;
  vec2 gradient = vec2(
    jellyActivityHeight(point + vec2(e, 0.0), shape) - jellyActivityHeight(point - vec2(e, 0.0), shape),
    jellyActivityHeight(point + vec2(0.0, e), shape) - jellyActivityHeight(point - vec2(0.0, e), shape)) / (2.0 * e);
  return vec4(gradient, h, smoothstep(0.0, .72, h));
}
`;
