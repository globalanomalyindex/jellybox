/** Roving focus follows the selected enabled option, then the first enabled one. */
export function selectionTabIndex(options, value, disabled = false) {
  if (disabled) return -1;
  const selected = options.findIndex((option) => Object.is(option.value, value) && !option.disabled);
  return selected >= 0 ? selected : options.findIndex((option) => !option.disabled);
}

/** Native buttons handle Space/Enter; this helper only handles radio navigation. */
export function selectionKeyIndex(options, current, key, { disabled = false, dir = 'ltr' } = {}) {
  if (disabled) return -1;
  const enabled = options.flatMap((option, index) => option.disabled ? [] : [index]);
  if (!enabled.length) return -1;
  if (key === 'Home') return enabled[0];
  if (key === 'End') return enabled[enabled.length - 1];
  let direction = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 0;
  if (!direction) return -1;
  if (dir === 'rtl' && (key === 'ArrowRight' || key === 'ArrowLeft')) direction *= -1;
  const position = enabled.indexOf(current);
  if (position < 0) return direction > 0 ? enabled[0] : enabled[enabled.length - 1];
  return enabled[(position + direction + enabled.length) % enabled.length];
}
