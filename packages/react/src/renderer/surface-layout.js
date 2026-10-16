// A bounded pool shares one WebGL context, light rig and transmission target.
export const OPTICAL_SURFACE_LIMIT = 32;
export const SURFACE_ROLES = Object.freeze({
  control: { depth: 1, layer: 1, priority: 3 },
  badge: { depth: .72, layer: 1, priority: 2 },
  alert: { depth: .85, layer: 1, priority: 1 },
  track: { depth: .35, layer: 1, priority: 3 },
  fill: { depth: .9, layer: 1.5, priority: 2 },
  thumb: { depth: 1.15, layer: 2, priority: 1 },
  table: { depth: .65, layer: 1, priority: 1 },
  row: { depth: .26, layer: 2, priority: 4 },
  menu: { depth: .8, layer: 4, priority: 0 },
  option: { depth: .7, layer: 5, priority: 1 },
});
export function intersectRect(a, b) {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width), bottom = Math.min(a.y + a.height, b.y + b.height);
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
}
export function pickSurfaces(candidates, limit = OPTICAL_SURFACE_LIMIT) {
  return candidates.filter(item => item.visibleRect.width > 1 && item.visibleRect.height > 1)
    .sort((a, b) => (a.priority ?? SURFACE_ROLES[a.kind]?.priority ?? 3) - (b.priority ?? SURFACE_ROLES[b.kind]?.priority ?? 3))
    .slice(0, limit);
}
// Keep a material's pigment/depth history attached to its DOM identity across
// sorting, filtering and popup insertion. Recycle only slots no longer visible.
export function assignSurfaceSlots(slots, items, limit = OPTICAL_SURFACE_LIMIT) {
  const keys = new Set(items.map(item => item.id));
  slots.forEach(slot => { if (!keys.has(slot.id)) slot.id = null; });
  return items.slice(0, limit).map(item => {
    let index = slots.findIndex(slot => slot.id === item.id);
    let fresh = false;
    if (index < 0) {
      index = slots.findIndex(slot => slot.id === null);
      if (index < 0) { index = slots.length; slots.push({ id: null }); }
      slots[index].id = item.id; fresh = true;
    }
    return { item, index, fresh };
  });
}
