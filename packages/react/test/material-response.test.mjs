import test from 'node:test';
import assert from 'node:assert/strict';
import { MOTION, sampleBezier, stepJellyResponse } from '../src/renderer/motion.js';
import { surfacePigment, surfacePigmentWeight } from '../src/renderer/surface-color.js';
import { SEMANTIC_COLORS } from '../src/tokens.js';

test('jelly recoil has one bounded overshoot, exact endpoints, while color easing stays monotonic', () => {
  for (const curve of [MOTION.squeeze, MOTION.recoilCurve, MOTION.settle]) {
    assert.equal(sampleBezier(curve, 0), 0); assert.equal(sampleBezier(curve, 1), 1);
  }
  const values = Array.from({length:101}, (_, i) => sampleBezier(MOTION.recoilCurve, i / 100));
  assert.ok(Math.max(...values) > 1.05 && Math.max(...values) < 1.12);
  let previous = 0;
  for (let i=0;i<=100;i++) { const next = sampleBezier(MOTION.settle, i/100); assert.ok(next >= previous && next <= 1); previous=next; }
});

test('interrupted material response continues at its displayed position and reduced motion clears residual strain', () => {
  const body = {};
  assert.equal(stepJellyResponse(body, 'press', 0, 0), 0);
  const part = stepJellyResponse(body, 'press', 1, .05);
  assert.ok(part > 0 && part < 1);
  assert.equal(stepJellyResponse(body, 'press', 0, 0), part);
  assert.equal(stepJellyResponse(body, 'press', 0, .016, {instant:true}), 0);
  assert.equal(stepJellyResponse(body, 'press', 1, 0, {instant:true}), 1);
});

test('structural material keeps color quiet; selection and semantic feedback own the pigment', () => {
  assert.ok(surfacePigmentWeight('row', true) > surfacePigmentWeight('row', false) * 10);
  assert.equal(surfacePigmentWeight('option', true, true), surfacePigmentWeight('option', false, true));
  assert.equal(surfacePigmentWeight('alert'), 1);
  for (const tone of Object.values(SEMANTIC_COLORS)) {
    assert.deepEqual(surfacePigment(tone.rgb, 'badge'), [...tone.rgb]);
    assert.deepEqual(surfacePigment(tone.rgb, 'alert'), [...tone.rgb]);
    const row=surfacePigment(tone.rgb, 'row', false), selected=surfacePigment(tone.rgb, 'row', true);
    assert.ok(row.every(x => Number.isFinite(x) && x>=0 && x<=1));
    assert.notDeepEqual(row, selected);
  }
});
