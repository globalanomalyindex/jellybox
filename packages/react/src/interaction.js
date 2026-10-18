import { MOTION, sampleBezier } from './renderer/motion.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const quantize = (value, min, max, step) => Number(clamp(min + Math.round((value - min) / step) * step, min, max).toFixed(8));

// Hover follows the displayed rounded surfaces; the native rail keeps its
// independent 44px click/drag target and keyboard behavior.
export function sliderHoverTarget(point, { thumb, value } = {}) {
  const contains = rect => {
    if (!point || !rect || !(rect.width > 0 && rect.height > 0)) return false;
    const radius = Math.min(rect.width, rect.height) / 2;
    const dx = Math.max(0, Math.abs(point.x - rect.left - rect.width / 2) - (rect.width / 2 - radius));
    const dy = Math.max(0, Math.abs(point.y - rect.top - rect.height / 2) - (rect.height / 2 - radius));
    return Math.hypot(dx, dy) <= radius;
  };
  return contains(thumb) ? 'thumb' : contains(value) ? 'value' : null;
}

const rangeValue = (value, { min, max, step = 1 }) => {
  if (step === 'any') return clamp(value, min, max);
  const unit = Number(step) > 0 ? Number(step) : 1;
  const lastStep = Number((min + Math.floor((max - min) / unit + 1e-8) * unit).toFixed(8));
  return quantize(value, min, Math.max(min, lastStep), unit);
};

// Native range geometry reserves half its 28px thumb at either endpoint.
export function rangePointValue(x, { left, width, thumb = 28, rtl = false, ...range }) {
  const fraction = clamp((x - left - thumb / 2) / Math.max(1, width - thumb), 0, 1);
  return rangeValue(range.min + (range.max - range.min) * (rtl ? 1 - fraction : fraction), range);
}

// After taking over an in-flight click, movement begins at the accepted value
// and current pointer. A distant original click is no longer an absolute anchor.
export function rangeDragValue(from, travel, { width, thumb = 28, rtl = false, ...range }) {
  const delta = travel / Math.max(1, width - thumb) * (range.max - range.min) * (rtl ? -1 : 1);
  return rangeValue(from + delta, range);
}

// A click changes the real value over one bounded clock, rather than leaving a
// decorative ghost behind an already-committed value. Direct input bypasses it.
export function rangeTravelValue(from, to, elapsed, range) {
  const phase = sampleBezier(MOTION.sliderTravelCurve, clamp(elapsed / MOTION.sliderTravel, 0, 1));
  return rangeValue(from + (to - from) * phase, range);
}

// Only the material leans. Native hit targets and readable content never move.
export function assistTarget(boxes, pointer, radius = 24) {
  if (!pointer) return null;
  let nearest = null;
  boxes.forEach((box, index) => {
    if (!box || box.disabled || box.width <= 0 || box.height <= 0) return;
    const dx = pointer.x - (box.x + box.width / 2), dy = pointer.y - (box.y + box.height / 2);
    const outside = Math.hypot(Math.max(0, Math.abs(dx) - box.width / 2), Math.max(0, Math.abs(dy) - box.height / 2));
    const distance = Math.hypot(dx, dy);
    if (outside > radius || nearest && nearest.distance <= distance) return;
    const strength = (1 - outside / radius) ** 2, travel = Math.min(box.assistLimit ?? 3, distance * .16) * strength;
    nearest = { index, distance, strength, x: distance ? dx / distance * travel : 0, y: distance ? dy / distance * travel : 0 };
  });
  return nearest;
}

export function scrubRange(start, travel, { min, max, step = 1, fine = false, rtl = false }) {
  const unit = step === 'any' ? (max - min) / 1000 || 1 : Number(step);
  const sensitivity = ((max - min) / 200 || unit) * (fine ? .1 : 1);
  return quantize(start + travel * sensitivity * (rtl ? -1 : 1), min, max, unit);
}

// Changing precision starts a fresh segment at the displayed value, not the drag origin.
export function advanceScrub(gesture, x, fine, range) {
  if (fine !== gesture.fine) return { ...gesture, x, value: gesture.current, fine };
  return { ...gesture, current: scrubRange(gesture.value, x - gesture.x, { ...range, fine }) };
}

// A bounded document-space canvas scrolls on the same compositor layer as text.
// Rebase only near its edges; the existing renderer still caps total pixels.
export function scrollFrame(previous, scroll, viewportHeight) {
  const padding = 160, height = viewportHeight + padding * 2;
  if (previous?.height === height && scroll >= previous.top + (previous.top ? 40 : 0) && scroll + viewportHeight <= previous.top + height - 40) return previous;
  return { top: Math.max(0, scroll - padding), height };
}
