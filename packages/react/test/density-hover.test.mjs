import test from 'node:test';
import assert from 'node:assert/strict';
import { densityFieldProfile, densityHoverResponse } from '../src/renderer/density-field.js';
import { MOTION } from '../src/renderer/motion.js';

test('folder hover wakes a readable filled mass with a bounded shared-current response', () => {
  const samples = Array.from({ length: 301 }, (_, i) => densityHoverResponse(1, i * MOTION.breathe / 300000));
  assert.ok(Math.max(...samples.map(s => s.jiggle)) > .16);
  assert.ok(Math.min(...samples.map(s => s.jiggle)) < -.16);
  assert.ok(samples.every(s => Math.abs(s.jiggle) <= .2 && s.amount >= .105 - 1e-9 && s.amount <= .155 + 1e-9));
  assert.ok(samples.every((s, i) => !i || Math.abs(s.jiggle - samples[i-1].jiggle) < .012));
  assert.deepEqual(densityHoverResponse(0, 3), { amount: 0, jiggle: 0 });
  assert.deepEqual(densityHoverResponse(1, 3, false), { amount: 0, jiggle: 0 });
  const half = densityHoverResponse(.5, 1), full = densityHoverResponse(1, 1);
  assert.equal(half.jiggle, full.jiggle / 2);
  assert.equal(half.amount, full.amount / 2);
  assert.ok(!('width' in full) && !('height' in full), 'hover belongs to the material, never native target geometry');
});

test('hover transfers the optical crown inside the folder while keeping a filled reading plane', () => {
  const region = { width: 400, height: 220, amount: 1, edge: 6, folder: true, fold: 1 };
  const left = { ...region, jiggle: -.2 }, right = { ...region, jiggle: .2 };
  const at = (x, y, field) => densityFieldProfile(x, y, field);
  assert.ok(at(-60, 0, left).height > at(-60, 0, right).height + .25, 'the internal material gathers on the approaching side');
  assert.ok(at(60, 0, right).height > at(60, 0, left).height + .25, 'the same crown flows across instead of pulsing uniformly');
  for (const field of [left, right]) for (const [x, y] of [[-65, 12], [55, -16], [172, -42]]) {
    const actual = at(x, y, field);
    const dx = (at(x + .001, y, field).height - at(x - .001, y, field).height) / .002;
    const dy = (at(x, y + .001, field).height - at(x, y - .001, field).height) / .002;
    assert.ok(actual.height > 4, 'the area remains a transmitting filled body');
    assert.ok(Math.abs(actual.dx - dx) < .001 && Math.abs(actual.dy - dy) < .001, 'refraction/highlights follow the actual density gradient');
  }
});
