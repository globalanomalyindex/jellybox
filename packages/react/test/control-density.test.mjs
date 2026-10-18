import test from 'node:test';
import assert from 'node:assert/strict';
import { controlDensityField, controlDensityRole, controlDensityPathFloor } from '../src/renderer/control-density.js';

test('compact controls carry a broad filled shoulder without changing their seam or reading center', () => {
  for (const [width, height, radius] of [[22, 22, 11], [72, 44, 22], [208, 48, 24]]) {
    const shape = { width, height, radius, amount: .7 };
    assert.equal(controlDensityField(0, 0, shape).height, 0, 'the whole center keeps its existing reading film');
    assert.equal(controlDensityField(width / 2, 0, shape).height, 0, 'the native silhouette remains the closed seam');
    assert.equal(controlDensityField(width / 2 + .1, 0, shape).height, 0);
    const samples = Array.from({ length: 71 }, (_, index) => controlDensityField(0, height / 2 - index / 10, shape));
    assert.ok(samples.filter(sample => sample.height > .2).length >= 17, 'a filled material shoulder, not a one-pixel stroke');
    assert.ok(samples.every(sample => sample.height >= 0 && sample.height <= 1.5 && sample.concentration >= 0 && sample.concentration <= 1));
    const empty = controlDensityField(0, height / 2 - 2, { ...shape, amount: 0 });
    assert.deepEqual(empty, { height: 0, dx: 0, dy: 0, concentration: 0 });
  }
});

test('the density normal follows the actual shoulder height around straight and curved edges', () => {
  const shape = { width: 90, height: 44, radius: 22, amount: .8 };
  for (const [x, y] of [[0, 20.7], [0, 17.2], [40, 7], [-40, -7], [29, 17]]) {
    const actual = controlDensityField(x, y, shape);
    const dx = (controlDensityField(x + .001, y, shape).height - controlDensityField(x - .001, y, shape).height) / .002;
    const dy = (controlDensityField(x, y + .001, shape).height - controlDensityField(x, y - .001, shape).height) / .002;
    assert.ok(Math.abs(actual.dx - dx) < .001 && Math.abs(actual.dy - dy) < .001, `height and refraction normal agree at ${x},${y}`);
  }
});

test('the compact shoulder is role-scoped and preserves activity, main windows and structural surfaces', () => {
  for (const kind of ['control', 'option', 'badge', 'thumb']) assert.equal(controlDensityRole(kind), true);
  for (const kind of ['window', 'track', 'fill', 'menu', 'row', 'table', 'alert']) assert.equal(controlDensityRole(kind), false);
  assert.equal(controlDensityRole('control', { activity: 'loading' }), false);
  assert.equal(controlDensityRole('control', { activity: 'success' }), false);
  assert.equal(controlDensityRole('control', { headerControl: true }), false);
});


test('small shoulders retain a readable absorption path without changing larger controls or the center', () => {
  assert.equal(controlDensityPathFloor(.45, 22), 4.5, 'the smallest rest crest has a material path rather than a pale hairline');
  assert.ok(controlDensityPathFloor(.45, 28) > 3 && controlDensityPathFloor(.45, 28) < 4.5);
  assert.equal(controlDensityPathFloor(.45, 40), 0);
  assert.equal(controlDensityPathFloor(.9, 48), 0, 'the already-readable larger pills are unchanged');
  for (const kind of ['control', 'badge', 'option']) assert.equal(controlDensityPathFloor(.45, 22, kind), 0, 'text-bearing roles retain their existing reading optics');
  assert.equal(controlDensityPathFloor(0, 22), 0, 'the center and closed seam remain outside the density support');
  assert.ok(controlDensityPathFloor(.65, 22) > controlDensityPathFloor(.45, 22), 'approach gathers the same path');
});
