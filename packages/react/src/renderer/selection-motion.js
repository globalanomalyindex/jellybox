import { MOTION } from './motion.js';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const coordinates = rect => ({ cx: rect.x + rect.width / 2, cy: rect.y + rect.height / 2,
  width: Math.max(1, rect.width), height: Math.max(1, rect.height),
  cornerRadius: Math.min(rect.cornerRadius ?? 22, rect.width / 2, rect.height / 2) });

function synchronize(state) {
  // Compatibility aliases describe one anchor, never two travelling boxes.
  state.head = state.anchor; state.tail = state.anchor;
  state.density = clamp(state.depth) ** 1.55;
  state.travel = state.phase === 'idle' ? 0 : state.phase === 'sink'
    ? 0.5 + clamp(state.depth) * 0.5 : (1 - clamp(state.depth)) * 0.5;
}

function snap(state, target) {
  state.anchor = { ...target }; state.currentKey = state.key;
  state.phase = 'idle'; state.depth = 1; state.depthVelocity = 0;
  state.colorProgress = 1; state.colorVelocity = 0; state.travelling = false;
  synchronize(state);
}

export function createSelectionMotion(rect, key) {
  const target = coordinates(rect), state = { key, target, sourceKey: key };
  snap(state, target);
  return state;
}

export function retargetSelection(state, rect, key, reducedMotion = false) {
  const target = coordinates(rect);
  if (reducedMotion) { state.key = key; state.target = target; snap(state, target); return state; }
  if (key === state.key) {
    if (state.phase === 'idle') state.anchor = { ...target };
    else {
      // Layout changes carry the currently assimilating surface with its
      // target. Scrolling/resizing never becomes a new selection transition.
      for (const property of ['cx', 'cy', 'width', 'height', 'cornerRadius'])
        state.anchor[property] += target[property] - state.target[property];
    }
  } else {
    state.sourceKey = state.currentKey;
    state.key = key;
    // Returning to the current source reverses absorption continuously.
    state.phase = key === state.currentKey ? 'rise' : 'sink';
    state.travelling = true;
    state.colorProgress = 0; state.colorVelocity = 0;
  }
  state.target = target;
  synchronize(state);
  return state;
}

function critical(value, velocity, target, frequency, dt) {
  const error = value - target, coefficient = velocity + frequency * error;
  const decay = Math.exp(-frequency * dt);
  return [target + (error + coefficient * dt) * decay,
    (velocity - frequency * coefficient * dt) * decay];
}

function settle(value, velocity, target, frequency, damping, dt) {
  const error = value - target, a = damping * frequency;
  const b = frequency * Math.sqrt(1 - damping * damping);
  const sine = Math.sin(b * dt), cosine = Math.cos(b * dt), decay = Math.exp(-a * dt);
  return [target + decay * (error * cosine + (velocity + a * error) / b * sine),
    decay * (velocity * cosine - (a * velocity + frequency * frequency * error) / b * sine)];
}

export function stepSelection(state, delta, reducedMotion = false) {
  if (reducedMotion) { snap(state, state.target); return state; }
  if (!state.travelling) return state;
  const dt = clamp(delta, 0, 0.055);
  [state.colorProgress, state.colorVelocity] = critical(state.colorProgress, state.colorVelocity,
    1, 7.5 / (MOTION.flow / 1000), dt);
  if (state.phase === 'sink') {
    [state.depth, state.depthVelocity] = critical(state.depth, state.depthVelocity, 0,
      7.1 / (MOTION.follow / 1000), dt);
    if (state.depth <= 0.012 && state.depthVelocity <= 0) {
      // One persistent surface changes anchor only while fully submerged.
      state.depth = 0; state.depthVelocity = 0;
      state.anchor = { ...state.target }; state.currentKey = state.key;
      state.phase = 'rise';
    }
  } else if (state.phase === 'rise') {
    [state.depth, state.depthVelocity] = settle(state.depth, state.depthVelocity, 1,
      6.5 / (MOTION.material / 1000), 0.78, dt);
    if (Math.abs(state.depth - 1) < 0.002 && Math.abs(state.depthVelocity) < 0.025) snap(state, state.target);
  }
  state.depth = clamp(state.depth, 0, 1.06);
  synchronize(state);
  return state;
}

export function selectionPresentation(state) {
  return { phase: state.phase, depth: state.depth, density: state.density,
    colorProgress: state.colorProgress, visibleKey: state.currentKey,
    targetKey: state.key, submerged: state.depth < 0.012 };
}

export function selectionRect(state) {
  const depth = clamp(state.depth), scale = 0.982 + depth * 0.018;
  const width = state.anchor.width * scale, height = state.anchor.height * scale;
  const round = state.anchor.cornerRadius + (Math.min(width, height) / 2 - state.anchor.cornerRadius) * (1 - depth) * 0.65;
  return { x: state.anchor.cx - width / 2, y: state.anchor.cy - height / 2,
    width, height, cornerRadius: Math.min(Math.max(0, round), width / 2, height / 2) };
}

/** Shared silhouette sampling for the actual meniscus and the SVG fallback. */
export function selectionContour(state) {
  const bounds = selectionRect(state), { x, y, width, height, cornerRadius: r } = bounds;
  const h = width / 2 - r, v = height / 2 - r, centerX = x + width / 2, centerY = y + height / 2;
  const points = [], straight = 6, arc = 12;
  const point = (px, py) => points.push({ x: centerX + px, y: centerY + py });
  for (let i = 0; i < straight; i++) point(-h + i * 2 * h / straight, -v - r);
  for (let i = 0; i < arc; i++) { const a = -Math.PI / 2 + i / arc * Math.PI / 2; point(h + Math.cos(a) * r, -v + Math.sin(a) * r); }
  for (let i = 0; i < straight; i++) point(h + r, -v + i * 2 * v / straight);
  for (let i = 0; i < arc; i++) { const a = i / arc * Math.PI / 2; point(h + Math.cos(a) * r, v + Math.sin(a) * r); }
  for (let i = 0; i < straight; i++) point(h - i * 2 * h / straight, v + r);
  for (let i = 0; i < arc; i++) { const a = Math.PI / 2 + i / arc * Math.PI / 2; point(-h + Math.cos(a) * r, v + Math.sin(a) * r); }
  for (let i = 0; i < straight; i++) point(-h - r, v - i * 2 * v / straight);
  for (let i = 0; i < arc; i++) { const a = Math.PI + i / arc * Math.PI / 2; point(-h + Math.cos(a) * r, -v + Math.sin(a) * r); }
  points.forEach((p, index) => {
    const before = points[(index + points.length - 1) % points.length], after = points[(index + 1) % points.length];
    const dx = after.x - before.x, dy = after.y - before.y, length = Math.hypot(dx, dy) || 1;
    p.nx = dy / length; p.ny = -dx / length;
  });
  return { points, bounds, ...selectionPresentation(state) };
}

export function selectionPath(contour, inset = 0) {
  const points = contour.points.map(p => ({ x: p.x - p.nx * inset, y: p.y - p.ny * inset }));
  const n = points.length, number = value => Number(value.toFixed(2));
  let path = `M${number(points[0].x)} ${number(points[0].y)}`;
  for (let i = 0; i < n; i++) {
    const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n], d = points[(i + 2) % n];
    path += `C${number(b.x + (c.x - a.x) / 6)} ${number(b.y + (c.y - a.y) / 6)} ${number(c.x - (d.x - b.x) / 6)} ${number(c.y - (d.y - b.y) / 6)} ${number(c.x)} ${number(c.y)}`;
  }
  return `${path}Z`;
}
