import test from 'node:test';
import assert from 'node:assert/strict';
import { intersectRect, pickSurfaces, assignSurfaceSlots, OPTICAL_SURFACE_LIMIT } from '../src/renderer/surface-layout.js';

test('scroll clipping retains original shape and intersects nested viewports', () => {
  const original = { x: -30, y: 20, width: 150, height: 60 };
  const clip = intersectRect(original, { x: 0, y: 0, width: 100, height: 50 });
  assert.deepEqual(clip, { x: 0, y: 20, width: 100, height: 30 });
  assert.equal(original.width, 150);
  assert.equal(intersectRect(clip, { x: 200, y: 0, width: 50, height: 50 }).width, 0);
});
test('only visible surfaces consume bounded slots, with popup priority', () => {
  const visibleRect = { x: 0, y: 0, width: 100, height: 40 };
  const items = Array.from({ length: 90 }, (_, id) => ({ id, kind: 'control', visibleRect }));
  items.push({ id: 'popup', kind: 'menu', visibleRect }, { id: 'offscreen', kind: 'menu', visibleRect: { ...visibleRect, height: 0 } });
  const picked = pickSurfaces(items);
  assert.equal(picked.length, OPTICAL_SURFACE_LIMIT);
  assert.equal(picked[0].id, 'popup');
  assert.ok(!picked.some(item => item.id === 'offscreen'));
});
test('sorting and popup insertion preserve existing pigment/depth slots', () => {
  const slots = [];
  assignSurfaceSlots(slots, [{ id: 'one' }, { id: 'two' }]);
  const reordered = assignSurfaceSlots(slots, [{ id: 'menu' }, { id: 'two' }, { id: 'one' }]);
  assert.deepEqual(reordered.map(entry => entry.index), [2, 1, 0]);
  assert.equal(reordered[1].fresh, false);
  const recycled = assignSurfaceSlots(slots, [{ id: 'three' }, { id: 'two' }]);
  assert.equal(recycled[0].index, 0);
  assert.equal(recycled[0].fresh, true);
  assert.equal(recycled[1].index, 1);
});
