import test from 'node:test';
import assert from 'node:assert/strict';
import { volumeCrown, volumeFullness, volumeHeight } from '../src/renderer/volume-profile.js';

test('small controls transmit through a full body while reading planes keep a quieter crown', () => {
  const height = kind => volumeHeight(1.65, 8, 0, 1, volumeCrown(22, 22), volumeFullness(kind));
  assert.equal(height('control'), 8);
  assert.equal(height('badge'), height('control'));
  assert.ok(height('menu') > height('table'));
  assert.ok(height('table') > height('window'));
  assert.ok(height('window') > 1.65);
  for (const kind of ['control', 'badge', 'menu', 'table', 'window']) {
    assert.equal(volumeHeight(1.65, 8, .5, 0, 0, volumeFullness(kind)), 0, 'closed perimeter remains on its seam');
  }
});
