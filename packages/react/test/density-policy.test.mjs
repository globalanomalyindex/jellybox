import test from 'node:test';
import assert from 'node:assert/strict';
import { densityShoulderAmount } from '../src/renderer/material.js';

test('the same density shoulder distinguishes rest, approach and commitment', () => {
  const rest = densityShoulderAmount();
  const hover = densityShoulderAmount({ hover: 1 });
  const selected = densityShoulderAmount({ selected: 1 });
  const approachedSelection = densityShoulderAmount({ hover: 1, selected: 1 });
  assert.ok(rest > 0, 'a rest control keeps a discoverable material boundary');
  assert.ok(rest < hover && hover < selected && selected < approachedSelection, 'approach and commitment remain ordered');
});

test('existing boolean state and overshooting spatial responses keep one bounded concentration', () => {
  const endpoint = densityShoulderAmount({ hover: 1, selected: 1 });
  assert.equal(densityShoulderAmount({ selected: true }), densityShoulderAmount({ selected: 1 }), 'native committed state has the same meaning as a settled response');
  assert.equal(densityShoulderAmount({ hover: 1.2, selected: 1.4 }), endpoint, 'jelly overshoot cannot over-concentrate the shoulder');
  assert.equal(densityShoulderAmount({ hover: -.2, selected: -.1 }), densityShoulderAmount(), 'withdrawal cannot erase the rest boundary');
  assert.ok(Number.isFinite(densityShoulderAmount({ hover: NaN, selected: Infinity })), 'invalid decorative samples cannot poison the material');
  const before = densityShoulderAmount({ hover: .47 - .00001, selected: .5 });
  const after = densityShoulderAmount({ hover: .47 + .00001, selected: .5 });
  assert.ok(after > before && after - before < .00001, 'the owner can move continuously through a state boundary');
});
