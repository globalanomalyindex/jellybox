import test from 'node:test';
import assert from 'node:assert/strict';
import { pocketProfile, pocketShape, stepPocket } from '../src/renderer/pocket.js';
const origin = { x: 0, y: 0, width: 220, height: 52 };

test('pocket has a dense core, rounded caps, curved normals and a finite smooth seam', () => {
  assert.deepEqual(pocketProfile(0, 0, 220, 52), { height: 1, pigment: 1, dx: -0, dy: -0 });
  const shoulder = pocketProfile(0, 18, 220, 52);
  assert.ok(shoulder.height > .3 && shoulder.height < .6);
  assert.ok(shoulder.dy < -.03, 'a real normal gradient bends light over the shoulder');
  assert.ok(pocketProfile(100, 0, 220, 52).dx < 0, 'rounded cap also bends light');
  for (const point of [[0, 26], [110, 0], [105, 20], [0, 80]]) {
    assert.deepEqual(pocketProfile(...point, 220, 52), { height: 0, pigment: 0, dx: 0, dy: 0 });
  }
  assert.ok(Math.abs(pocketProfile(0, 25.999, 220, 52).dy) < .01, 'slope returns to the surrounding film');
});

test('travel settles with bounded overshoot and small area-preserving recoil', () => {
  let state = stepPocket(null, origin, 0);
  const target = { ...origin, y: 60 };
  let highest = 0, strain = 0, lowestStrain = 0;
  for (let i = 0; i < 120; i++) {
    state = stepPocket(state, target, 1 / 120);
    highest = Math.max(highest, state.y); strain = Math.max(strain, state.strain); lowestStrain = Math.min(lowestStrain, state.strain);
    const shape = pocketShape(state);
    assert.ok(Math.abs(shape.width * shape.height - state.width * state.height) < 1e-6);
  }
  assert.ok(highest > 61 && highest < 65, 'visible, restrained arrival overshoot');
  assert.ok(strain > .025 && strain < .12);
  assert.ok(lowestStrain < 0, 'one diminishing squeeze after the stretch');
  assert.ok(Math.abs(state.y - 60) < .001 && Math.abs(state.strain) < .001);
});

test('rapid retargets retain momentum without jumps or queued destinations', () => {
  let state = stepPocket(null, origin, 0);
  state = stepPocket(state, { ...origin, y: 120 }, .06);
  const y = state.y, vy = state.vy;
  assert.ok(vy > 0);
  state = stepPocket(state, { ...origin, y: -60, width: 180 }, 0);
  assert.equal(state.y, y); assert.equal(state.vy, vy);
  for (let i = 0; i < 120; i++) state = stepPocket(state, state.target, 1 / 120);
  assert.ok(Math.abs(state.y + 60) < .001 && Math.abs(state.width - 180) < .001);
});

test('travel is refresh-rate independent; reduced motion resets all strain and velocity', () => {
  const run = hz => { let s = stepPocket(null, origin, 0); for (let i = 0; i < hz / 2; i++) s = stepPocket(s, { ...origin, y: 60 }, 1 / hz); return s; };
  assert.ok(Math.abs(run(60).y - run(120).y) < 1e-8);
  const reduced = stepPocket(run(60), { ...origin, y: -60 }, .016, true);
  assert.equal(reduced.y, -60);
  for (const key of ['vx', 'vy', 'vw', 'vh', 'strain', 'strainVelocity']) assert.equal(reduced[key], 0);
  assert.deepEqual(pocketShape(reduced), { ...origin, y: -60 });
});
