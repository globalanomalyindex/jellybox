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

test('folder approach gathers a traveling shoulder instead of tinting the whole reading plateau', () => {
  const region = { width: 400, height: 220, amount: .94, edge: 5, folder: true, fold: 1, jiggle: 0 };
  const resting = densityFieldProfile(193, -20, region);
  const early = densityFieldProfile(193, -20, { ...region, hover: 1, current: 0 });
  const later = densityFieldProfile(193, -20, { ...region, hover: 1, current: Math.PI });
  assert.ok(early.height > resting.height + .2 && later.height > resting.height + .2, 'approach adds actual local material');
  assert.ok(Math.abs(early.height - later.height) > .25, 'the same mass visibly transfers along the shoulder');
  assert.ok(early.pigment > resting.pigment && later.pigment > resting.pigment, 'pigment concentration follows the gathering height');
  assert.deepEqual(densityFieldProfile(0, 0, { ...region, hover: 1, current: 0 }), densityFieldProfile(0, 0, region), 'the broad reading plateau stays steady');
  assert.deepEqual(densityFieldProfile(193, -20, { ...region, hover: 0, current: 2 }), resting, 'leaving returns to the exact incumbent density');
  const plain = { ...region, folder: false };
  assert.deepEqual(densityFieldProfile(193, -20, { ...plain, hover: 1, current: 2 }), densityFieldProfile(193, -20, plain), 'other parent density fields retain their identity');
  for (const current of [0, .7, Math.PI]) for (const [x, y] of [[193, -20], [-193, -20], [25, -103]]) {
    const field = { ...region, hover: .8, current };
    const p = densityFieldProfile(x, y, field);
    const dx = (densityFieldProfile(x + .001, y, field).height - densityFieldProfile(x - .001, y, field).height) / .002;
    const dy = (densityFieldProfile(x, y + .001, field).height - densityFieldProfile(x, y - .001, field).height) / .002;
    assert.ok(Math.abs(p.dx - dx) < .001 && Math.abs(p.dy - dy) < .001, 'highlight/refraction slope remains the actual gathered-height derivative');
  }
});
