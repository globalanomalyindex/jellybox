const candidates = 'button, a[href], area[href], input, select, textarea, summary, audio[controls], video[controls], [tabindex], [contenteditable]';

function usable(dialog, node) {
  if (!node || node === dialog || !dialog.contains(node) || typeof node.focus !== 'function'
    || node.matches(':disabled, input[type="hidden"]') || node.closest('[hidden], [inert]') || !node.getClientRects().length) return false;
  const visibility = dialog.ownerDocument.defaultView.getComputedStyle(node).visibility;
  return visibility !== 'hidden' && visibility !== 'collapse';
}

export function dialogTabStops(dialog) {
  const visible = [...dialog.querySelectorAll(candidates)].filter(node => node.tabIndex >= 0 && usable(dialog, node));
  // A named native radio group contributes its checked member (or first
  // enabled member) to sequential navigation, not every radio in the group.
  const stops = visible.filter(node => {
    if (!node.matches('input[type="radio"]') || !node.name) return true;
    const group = visible.filter(other => other.matches('input[type="radio"]') && other.name === node.name && other.form === node.form);
    return node === (group.find(other => other.checked) || group[0]);
  });
  return stops.sort((a, b) => (a.tabIndex > 0 ? a.tabIndex : Infinity) - (b.tabIndex > 0 ? b.tabIndex : Infinity));
}

/** Recover focus after an interrupted inert exit without stealing valid focus. */
export function restoreDialogFocus(dialog, preferred = [], force = false) {
  const document = dialog.ownerDocument;
  if (!force && usable(dialog, document.activeElement)) return document.activeElement;
  for (const node of [...preferred, ...dialogTabStops(dialog)]) {
    if (!usable(dialog, node)) continue;
    node.focus({ preventScroll: true });
    if (document.activeElement === node) return node;
  }
  dialog.focus({ preventScroll: true });
  return document.activeElement;
}

/** Supplement native modal containment at sequential-navigation boundaries. */
export function wrapDialogTab(event, dialog) {
  if (event.key !== 'Tab' || event.defaultPrevented) return false;
  const stops = dialogTabStops(dialog);
  const active = dialog.ownerDocument.activeElement;
  const outside = active === dialog || !dialog.contains(active);
  const first = stops[0], last = stops[stops.length - 1];
  if (!stops.length || outside || (event.shiftKey ? active === first : active === last)) {
    event.preventDefault();
    (event.shiftKey ? last : first)?.focus();
    if (!stops.length) dialog.focus({ preventScroll: true });
    return true;
  }
  return false;
}
