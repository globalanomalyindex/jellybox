import test from 'node:test';
import assert from 'node:assert/strict';
import { densityHoverResponse } from '../src/renderer/density-field.js';
import { MOTION } from '../src/renderer/motion.js';

test('folder hover gently circulates its existing density while native bounds remain external', () => {
  const samples = Array.from({ length: 121 }, (_, i) => densityHoverResponse(1, i * MOTION.breathe / 120000));
  assert.ok(Math.max(...samples.map(s => s.jiggle)) > .2);
  assert.ok(Math.min(...samples.map(s => s.jiggle)) < -.2);
  assert.ok(samples.every(s => Math.abs(s.jiggle) <= .28 && s.amount >= .038 && s.amount <= .082));
  assert.ok(samples.every((s, i) => !i || Math.abs(s.jiggle - samples[i-1].jiggle) < .02));
  assert.deepEqual(densityHoverResponse(0, 3), { amount: 0, jiggle: 0 });
  assert.deepEqual(densityHoverResponse(1, 3, false), { amount: 0, jiggle: 0 });
  const half = densityHoverResponse(.5, 1), full = densityHoverResponse(1, 1);
  assert.equal(half.jiggle, full.jiggle / 2);
  assert.equal(half.amount, full.amount / 2);
  assert.ok(!('width' in full) && !('height' in full), 'hover belongs to the material, never native target geometry');
});
