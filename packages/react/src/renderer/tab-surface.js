// A continuous top-left shoulder, shared by the mesh, ray samples, receiver
// and SVG fallback. The pill becomes a dense region of this one closed body.
export const TAB_DEPTH_RATIO = .66;
const smooth = (a, b, value) => {
  const t = Math.max(0, Math.min(1, (value - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const shoulder = (x, width, tab) => {
  const end = tab.width + (tab.neck?.pull || 0) * .35;
  return 1 - smooth(end - 24, end + 36, x + width / 2);
};
const bell = value => Math.exp(-value * value);

// One continuous boundary: tension lengthens its shoulder, the adjacent
// concavity pinches the join, and only this small material region recoils.
function boundaryLift(x, width, tab) {
  if (!tab) return 0;
  const { pull = 0, pinch = 0, wobble = 0 } = tab.neck || {};
  const u = x + width / 2, join = tab.width + pull * .35;
  return tab.lift * shoulder(x, width, tab)
    + pull * .65 * bell((u - join - 16) / 34)
    - pinch * 20 * bell((u - join + 4) / 18)
    + wobble * bell((u - tab.width - 4) / 52);
}

export function tabMaximumLift(tab) {
  return tab ? Math.max(0, tab.lift) + Math.abs(tab.neck?.pull || 0) * .65 + Math.abs(tab.neck?.wobble || 0) : 0;
}

export function tabWarpY(x, y, width, height, tab) {
  return y + boundaryLift(x, width, tab) * smooth(-132, 0, y - height / 2);
}

export function tabUnwarpY(x, y, width, height, tab) {
  const lift = boundaryLift(x, width, tab);
  if (!lift) return y;
  let base = y - lift;
  // The bounded field is monotonic in Y. Newton inversion keeps mesh, sampled
  // photons and analytic receiver in the same coordinates during a pinch.
  for (let i = 0; i < 4; i++) {
    const t = Math.max(0, Math.min(1, (base - height / 2 + 132) / 132));
    base -= (base + lift * t * t * (3 - 2 * t) - y) / (1 + lift * 6 * t * (1 - t) / 132);
  }
  return base;
}

export function tabDensity(x, y, width, height, tab) {
  if (!tab) return 0;
  const pull = tab.neck?.pull || 0, pinch = tab.neck?.pinch || 0;
  const base = tab.amount * shoulder(x, width, tab) * (1 - smooth(4, 56, height / 2 - y));
  const neck = Math.min(.45, pull / 48 * .35 + pinch * .1) * bell((x + width / 2 - tab.width - pull * .35 - 12) / 38) * (1 - smooth(0, 36, height / 2 - y));
  return Math.max(base, neck);
}

export function tabOutlinePath(width, height, radius, tab) {
  const r = Math.min(radius, width / 2, height / 2), points = [];
  const point = (x, y) => points.push(`${(x + width / 2).toFixed(2)},${(height / 2 - tabWarpY(x, y, width, height, tab)).toFixed(2)}`);
  const hx = width / 2 - r, hy = height / 2 - r;
  const edge = (ax, ay, bx, by, count = 32) => { for (let i = 0; i < count; i++) point(ax + (bx - ax) * i / count, ay + (by - ay) * i / count); };
  const arc = (cx, cy, angle) => { for (let i = 0; i < 16; i++) { const a = angle - i / 16 * Math.PI / 2; point(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } };
  edge(-hx, height / 2, hx, height / 2, 64); arc(hx, hy, Math.PI / 2);
  edge(width / 2, hy, width / 2, -hy); arc(hx, -hy, 0);
  edge(hx, -height / 2, -hx, -height / 2); arc(-hx, -hy, -Math.PI / 2);
  edge(-width / 2, -hy, -width / 2, hy); arc(-hx, hy, Math.PI);
  return `M${points.join('L')}Z`;
}

// Same field for the analytic cast. tab = width/lift/density;
// neck = pull in pixels, normalized pinch, signed recoil in pixels.
export const TAB_GLSL = `
float tabBell(float x) { return exp(-x * x); }
float tabShoulder(float x, float width, vec3 tab, vec3 neck) {
  float end = tab.x + neck.x * .35;
  return 1.0 - smoothstep(end - 24.0, end + 36.0, x + width * .5);
}
float tabBoundaryLift(float x, float width, vec3 tab, vec3 neck) {
  float u = x + width * .5, join = tab.x + neck.x * .35;
  return tab.y * tabShoulder(x, width, tab, neck)
    + neck.x * .65 * tabBell((u - join - 16.0) / 34.0)
    - neck.y * 20.0 * tabBell((u - join + 4.0) / 18.0)
    + neck.z * tabBell((u - tab.x - 4.0) / 52.0);
}
float tabUnwarp(float x, float y, float width, float height, vec3 tab, vec3 neck) {
  float lift = tabBoundaryLift(x, width, tab, neck);
  float base = y - lift;
  for (int i = 0; i < 4; i++) {
    float t = clamp((base - height * .5 + 132.0) / 132.0, 0.0, 1.0);
    base -= (base + lift * t * t * (3.0 - 2.0 * t) - y) / (1.0 + lift * 6.0 * t * (1.0 - t) / 132.0);
  }
  return base;
}
float tabDensityAt(vec2 p, float width, float height, vec3 tab, vec3 neck) {
  float base = tab.z * tabShoulder(p.x, width, tab, neck) * (1.0 - smoothstep(4.0, 56.0, height * .5 - p.y));
  float density = min(.45, neck.x / 48.0 * .35 + neck.y * .1) * tabBell((p.x + width * .5 - tab.x - neck.x * .35 - 12.0) / 38.0) * (1.0 - smoothstep(0.0, 36.0, height * .5 - p.y));
  return max(base, density);
}`;
