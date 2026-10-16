const clamp = value => Math.max(0, Math.min(1, value));

export function scrollEdgeState({ viewportHeight, documentHeight, scroll, storyTop, credits, protected: protect = false, transparent = false }) {
  const baseHeight = Math.max(72, Math.min(112, viewportHeight * .12));
  const clearance = credits.bottom > 0 && credits.top < viewportHeight ? Math.max(0, viewportHeight - credits.bottom - 16) : baseHeight;
  const height = Math.min(baseHeight, clearance);
  const remaining = documentHeight - viewportHeight - scroll;
  const active = scroll > 0 && storyTop < viewportHeight - 48 && height >= 12 && !protect && !transparent;
  const t = clamp((remaining - 8) / Math.max(1, height));
  return { height, active, more: remaining > 8, strength: active ? t * t * (3 - 2 * t) : 0 };
}
