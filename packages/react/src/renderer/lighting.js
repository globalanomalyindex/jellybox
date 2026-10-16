export const DEFAULT_LIGHT = Object.freeze({ x: .926567, y: .313523, height: 152, intensity: 1, softness: .45, warmth: .5, enabled: true });
export function defaultLightForViewport(width) {
  return { ...DEFAULT_LIGHT, ...(width <= 700 ? { x: Math.min(DEFAULT_LIGHT.x, 1 - 30 / Math.max(60, width)), y: .075 } : {}) };
}
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function moveLight(start, dx, dy, bounds) {
  const insetX = Math.min(.5, 30 / Math.max(1, bounds.width));
  const insetY = Math.min(.5, 30 / Math.max(1, bounds.height));
  return { x: clamp(start.x + dx / Math.max(1, bounds.width), insetX, 1 - insetX), y: clamp(start.y + dy / Math.max(1, bounds.height), insetY, 1 - insetY) };
}
export function lightTemperature(warmth) {
  const t = clamp(warmth, 0, 1);
  return t < .5 ? [1 - (.5 - t) * .26, 1 - (.5 - t) * .1, 1] : [1, 1 - (t - .5) * .22, 1 - (t - .5) * .52];
}

// Transport the already sampled receiver in the same frame as its material.
// A document-canvas rebase changes world coordinates, not the local light path;
// waiting for the next photon sample leaves the cast behind for up to 125ms.
export function moveReceiverField(field, position) {
  if (field.origin) {
    field.rect.x += position.x - field.origin.x;
    field.rect.y += position.y - field.origin.y;
  }
  field.origin = { x: position.x, y: position.y };
}
