import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LIGHT, defaultLightForViewport, moveLight, lightTemperature } from '../src/renderer/lighting.js';

test('drag distance scales with the canvas and keeps the bulb reachable at every edge', () => {
  assert.deepEqual(moveLight({ x: .5, y: .5 }, 100, -50, { width: 1000, height: 500 }), { x: .6, y: .4 });
  assert.deepEqual(moveLight({ x: .5, y: .5 }, -9000, 9000, { width: 390, height: 450 }), { x: 30 / 390, y: 1 - 30 / 450 });
  assert.deepEqual(moveLight({ x: .5, y: .5 }, 9000, -9000, { width: 390, height: 450 }), { x: 1 - 30 / 390, y: 30 / 450 });
});
test('collapsed or very small fields keep the bulb centered without invalid positions', () => {
  for (const size of [0, 1, 25, 60]) assert.deepEqual(moveLight({ x: .2, y: .3 }, 100, -100, { width: size, height: size }), { x: .5, y: .5 });
});
test('compact reset places the bulb in its reserved row; desktop preserves the original light', () => {
  const mobile = defaultLightForViewport(390), desktop = defaultLightForViewport(1280);
  assert.equal(mobile.y, .075);
  assert.ok(mobile.x > .8 && mobile.x <= 1 - 30 / 390);
  assert.deepEqual(desktop, DEFAULT_LIGHT);
  desktop.height = 500;
  assert.equal(defaultLightForViewport(1280).height, 152);
});
test('temperature stays neutral at the midpoint and bounded at cool/warm limits', () => {
  assert.deepEqual(lightTemperature(.5), [1, 1, 1]);
  assert.equal(lightTemperature(0)[2], 1);
  assert.equal(lightTemperature(1)[0], 1);
  assert.ok(lightTemperature(0)[0] < lightTemperature(0)[2]);
  assert.ok(lightTemperature(1)[2] < lightTemperature(1)[0]);
  assert.deepEqual(lightTemperature(-10), lightTemperature(0));
  assert.deepEqual(lightTemperature(10), lightTemperature(1));
});
