import test from 'node:test';
import assert from 'node:assert/strict';
import { tabWarpY, tabUnwarpY, tabDensity, tabOutlinePath } from '../src/renderer/tab-surface.js';

test('an unmerged window retains its original surface and has no tab density', () => {
  assert.equal(tabWarpY(-180, 200, 580, 400, { width: 230, lift: 0, amount: 0 }), 200);
  assert.equal(tabDensity(-180, 190, 580, 400, { width: 230, lift: 0, amount: 0 }), 0);
});

test('geometry and ray/receiver coordinates agree throughout tab emergence', () => {
  for (const width of [280, 580]) for (const amount of [0, .2, .7, 1]) {
    const tab = { width: Math.min(230, width * .48), lift: 34 * amount, amount };
    for (let x = -width / 2; x <= width / 2; x += 17) for (let y = -200; y <= 200; y += 13) {
      const warped = tabWarpY(x, y, width, 400, tab);
      assert.ok(Math.abs(tabUnwarpY(x, warped, width, 400, tab) - y) < .01);
    }
    assert.equal(tabWarpY(-width / 2, 200, width, 400, tab), 200 + tab.lift);
    assert.equal(tabWarpY(width / 2, 200, width, 400, tab), 200);
  }
});

test('the tab carries density into its neck without a second internal perimeter', () => {
  const tab = { width: 230, lift: 34, amount: 1 };
  assert.ok(tabDensity(-180, 198, 580, 400, tab) > .9);
  assert.ok(tabDensity(-180, 180, 580, 400, tab) > .5);
  assert.equal(tabDensity(-180, 140, 580, 400, tab), 0);
  assert.equal(tabDensity(200, 180, 580, 400, tab), 0);
  const path = tabOutlinePath(580, 400, 30, tab);
  assert.equal((path.match(/M/g) || []).length, 1);
  assert.equal((path.match(/Z/g) || []).length, 1);
  assert.ok(!path.includes('NaN'));
});

test('a strained join pulls and pinches locally while the reading plane stays fixed', () => {
  const rest = { width: 164, lift: 24, amount: 1 };
  const drawn = { ...rest, neck: { pull: 44, pinch: 0, wobble: 0 } };
  const pinched = { ...drawn, neck: { ...drawn.neck, pinch: 1 } };
  const top = 200, at = offset => offset - 290;
  assert.ok(tabWarpY(at(188), top, 580, 400, drawn) > tabWarpY(at(188), top, 580, 400, rest) + 8);
  assert.ok(tabWarpY(at(176), top, 580, 400, pinched) < tabWarpY(at(176), top, 580, 400, drawn) - 5);
  assert.equal(tabWarpY(at(176), 0, 580, 400, pinched), 0);
  for (let x=-280;x<280;x+=11) for(let y=80;y<=230;y+=7) {
    const warped=tabWarpY(x,y,580,400,pinched);
    assert.ok(Math.abs(tabUnwarpY(x,warped,580,400,pinched)-y)<.01);
  }
});
