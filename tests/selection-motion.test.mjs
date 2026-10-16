import test from 'node:test';
import assert from 'node:assert/strict';
import { createSelectionMotion, retargetSelection, stepSelection, selectionRect,
  selectionPresentation, selectionContour, selectionPath } from '../src/selection-motion.js';

const a = { x: 20, y: 40, width: 120, height: 72, cornerRadius: 22 };
const b = { ...a, x: 164 };
const c = { ...a, x: 308, y: 142, width: 146 };
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.00001, `${actual} ≠ ${expected}`);
const finish = state => { for (let i = 0; i < 180; i++) stepSelection(state, 1 / 60); return state; };
const advanceToRise = state => {
  for (let i = 0; i < 120 && state.phase === 'sink'; i++) stepSelection(state, 1 / 120);
  assert.equal(state.phase, 'rise'); return state;
};

test('initial selection is fully emerged at one anchor', () => {
  const state = createSelectionMotion(a, 'a');
  assert.deepEqual(selectionRect(state), a);
  assert.equal(state.depth, 1);
  assert.equal(state.density, 1);
  assert.equal(state.travelling, false);
  assert.equal(selectionPresentation(state).visibleKey, 'a');
});

test('old selection sinks locally, swaps only while submerged, then settles at destination', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, b, 'b');
  for (let i = 0; i < 6; i++) stepSelection(state, 1 / 120);
  const rect = selectionRect(state);
  assert.ok(state.depth > 0 && state.depth < 1);
  near(rect.x + rect.width / 2, a.x + a.width / 2);
  assert.ok(rect.width <= a.width && rect.height <= a.height);
  assert.equal(state.currentKey, 'a');
  advanceToRise(state);
  assert.equal(state.currentKey, 'b');
  assert.equal(state.depth, 0);
  assert.equal(state.density, 0);
  near(state.anchor.cx, b.x + b.width / 2);
  finish(state);
  assert.deepEqual(selectionRect(state), b);
  assert.equal(state.phase, 'idle');
});

test('vertical and wrapped transfer never encloses the intervening row', () => {
  const state = createSelectionMotion(a, 'a');
  const below = { ...a, x: 236, y: a.y + 120 };
  retargetSelection(state, below, 'below');
  for (let i = 0; i < 7; i++) stepSelection(state, 1 / 120);
  const rect = selectionRect(state);
  near(rect.x + rect.width / 2, a.x + a.width / 2);
  near(rect.y + rect.height / 2, a.y + a.height / 2);
  assert.ok(rect.height <= a.height);
  finish(state);
  assert.deepEqual(selectionRect(state), below);
});

test('rise has bounded damped settlement without changing the destination anchor', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, b, 'b'); advanceToRise(state);
  let maximum = 0;
  for (let i = 0; i < 90; i++) {
    stepSelection(state, 1 / 120);
    maximum = Math.max(maximum, state.depth);
    assert.ok(state.depth >= 0 && state.depth <= 1.06);
    near(state.anchor.cx, b.x + b.width / 2);
  }
  assert.ok(maximum > 1 && maximum < 1.04);
  finish(state);
  assert.equal(state.depth, 1);
  assert.equal(state.depthVelocity, 0);
});

test('rapid retargeting preserves current depth, velocity and anchor; latest target wins', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, c, 'c'); stepSelection(state, 0.04);
  const before = selectionRect(state), depth = state.depth, velocity = state.depthVelocity;
  retargetSelection(state, b, 'b');
  assert.deepEqual(selectionRect(state), before);
  assert.equal(state.depth, depth);
  assert.equal(state.depthVelocity, velocity);
  finish(state);
  assert.deepEqual(selectionRect(state), b);
  assert.equal(state.currentKey, 'b');
});

test('returning to source reverses assimilation without a depth or position jump', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, b, 'b'); stepSelection(state, 0.04);
  const before = selectionRect(state), depth = state.depth, velocity = state.depthVelocity;
  retargetSelection(state, a, 'a');
  assert.equal(state.phase, 'rise');
  assert.deepEqual(selectionRect(state), before);
  assert.equal(state.depth, depth); assert.equal(state.depthVelocity, velocity);
  finish(state);
  assert.deepEqual(selectionRect(state), a);
});

test('retarget while emerging sinks from the current emerging surface', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, b, 'b'); advanceToRise(state); stepSelection(state, 0.04);
  const before = selectionRect(state), depth = state.depth, velocity = state.depthVelocity;
  retargetSelection(state, c, 'c');
  assert.equal(state.phase, 'sink');
  assert.equal(state.currentKey, 'b');
  assert.deepEqual(selectionRect(state), before);
  assert.equal(state.depth, depth); assert.equal(state.depthVelocity, velocity);
  finish(state);
  assert.deepEqual(selectionRect(state), c);
});

test('reduced motion snaps position, depth, material mix and clears residual velocities', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, c, 'c'); stepSelection(state, 0.05);
  retargetSelection(state, b, 'b', true);
  assert.deepEqual(selectionRect(state), b);
  assert.equal(state.travel, 0); assert.equal(state.phase, 'idle');
  assert.equal(state.depth, 1); assert.equal(state.depthVelocity, 0);
  assert.equal(state.colorProgress, 1); assert.equal(state.colorVelocity, 0);
  retargetSelection(state, c, 'c'); stepSelection(state, 0.01, true);
  assert.deepEqual(selectionRect(state), c);
  assert.equal(state.currentKey, 'c');
});

test('same-key layout updates bounds without phantom assimilation', () => {
  const state = createSelectionMotion(a, 'a');
  const moved = { ...a, x: 55, y: 160, width: 150 };
  retargetSelection(state, moved, 'a');
  assert.deepEqual(selectionRect(state), moved);
  assert.equal(state.travelling, false); assert.equal(state.phase, 'idle');
});

test('layout changes during assimilation carry the current anchor without losing velocity', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, b, 'b'); stepSelection(state, 0.05);
  const before = selectionRect(state), velocity = state.depthVelocity;
  retargetSelection(state, { ...b, x: b.x + 30, y: b.y + 80 }, 'b');
  const after = selectionRect(state);
  near(after.x, before.x + 30); near(after.y, before.y + 80);
  near(after.width, before.width);
  assert.equal(state.depthVelocity, velocity);
  assert.equal(state.travelling, true);
});

test('SVG and meniscus share a finite closed contour within the local anchor', () => {
  const state = createSelectionMotion(a, 'a');
  retargetSelection(state, c, 'c'); stepSelection(state, 0.06);
  const contour = selectionContour(state), path = selectionPath(contour, 2);
  assert.equal(contour.points.length, 72);
  assert.ok(path.startsWith('M') && path.endsWith('Z'));
  assert.equal(path.match(/C/g).length, 72);
  assert.ok(!/NaN|Infinity/.test(path));
  for (const point of contour.points) {
    assert.ok(point.x >= contour.bounds.x - 1e-8 && point.x <= contour.bounds.x + contour.bounds.width + 1e-8);
    assert.ok(point.y >= contour.bounds.y - 1e-8 && point.y <= contour.bounds.y + contour.bounds.height + 1e-8);
    near(Math.hypot(point.nx, point.ny), 1);
  }
});
