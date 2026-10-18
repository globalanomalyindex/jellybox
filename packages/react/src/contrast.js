import { colorLuminance } from './tokens.js';
import { normalizeJellyColor } from './color.js';

export const JELLY_INK = Object.freeze({ dark: '#000000', light: '#ffffff', minimum: 4.5 });
export const contrastRatio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
// The native skin owns its reading ink; samples verify the material beneath it.
// Without an authored intent, transmitting jelly prefers dark text whenever it
// passes. Moving glare must not preserve an unnecessary white-text treatment.
export function chooseJellyInk(samples, previous, { preferred } = {}) {
  const intended = preferred === undefined ? undefined : normalizeJellyColor(preferred);
  if (intended !== undefined && intended !== JELLY_INK.dark && intended !== JELLY_INK.light) {
    throw new RangeError('JellyBox reading ink must be solid black or white.');
  }
  const luminances = samples.map(value => {
    if (typeof value !== 'number') return colorLuminance(normalizeJellyColor(value));
    if (!Number.isFinite(value)) throw new TypeError('A contrast sample must be a finite luminance or hex color.');
    return Math.max(0, Math.min(1, value));
  });
  if (!luminances.length) return { ink: intended || JELLY_INK.dark, ratio: 0, halo: false };
  const score = ink => Math.min(...luminances.map(l => contrastRatio(l, colorLuminance(ink))));
  const dark = score(JELLY_INK.dark), light = score(JELLY_INK.light);
  // `previous` remains accepted for source compatibility. A passing old white
  // choice no longer overrides the dark reading policy. An explicit intent is
  // authoritative, but its measured ratio can still honestly report failure.
  const ink = intended || (dark >= JELLY_INK.minimum || dark >= light ? JELLY_INK.dark : JELLY_INK.light);
  const ratio = score(ink);
  // Retained for compatibility with 0.5.0 consumers; never outline the glyphs.
  return { ink, ratio, halo: false };
}

export function inkStyle(pigment) {
  // The CSS skin transmits the neutral receiver; raw pigment is not its final
  // background. Optional optics supports the same intent and verifies it with
  // actual pixel samples instead of recoloring text whenever highlights move.
  const color = normalizeJellyColor(pigment);
  const background = '#' + [1, 3, 5].map((at, i) => Math.round(parseInt(color.slice(at, at + 2), 16) * .42 + [244, 245, 246][i] * .58).toString(16).padStart(2, '0')).join('');
  const { ink } = chooseJellyInk([background]);
  return { '--jb-reading-ink': ink, '--jb-control-ink': ink, '--jb-ink': ink };
}

// This independent property never references --jb-rendered-ink. Keeping the
// authored intent separate prevents a sampler/material feedback loop.
export function jellyReadingInk(element) {
  const view = element?.ownerDocument?.defaultView;
  const value = view?.getComputedStyle(element).getPropertyValue('--jb-reading-ink').trim().toLowerCase();
  return value === '#fff' || value === JELLY_INK.light ? JELLY_INK.light : JELLY_INK.dark;
}

export function applyJellyInk(element, result) {
  if (!element?.isConnected) return;
  // An async readback may arrive after the native skin has changed. Drop that
  // obsolete polarity and let the current fallback own ink until verified.
  if (result.ink !== jellyReadingInk(element)) { clearJellyInk(element); return; }
  if (element.style.getPropertyValue('--jb-rendered-ink') !== result.ink) element.style.setProperty('--jb-rendered-ink', result.ink);
  element.style.removeProperty('--jb-ink-halo'); element.style.removeProperty('--jb-ink-edge');
  element.dataset.gelInk = result.ink === JELLY_INK.dark ? 'dark' : 'light';
  element.dataset.gelContrast = result.ratio.toFixed(2);
  delete element.dataset.gelInkGuard;
}

export function clearJellyInk(element) {
  if (!element.hasAttribute('data-gel-ink') && !element.style.getPropertyValue('--jb-rendered-ink')) return;
  delete element.dataset.gelInk; delete element.dataset.gelContrast; delete element.dataset.gelInkGuard;
  element.style.removeProperty('--jb-rendered-ink'); element.style.removeProperty('--jb-ink-halo');
  element.style.removeProperty('--jb-ink-edge');
}

export function inkSampleRect(rect) {
  return { x: rect.x + rect.width * .05, y: rect.y + rect.height * .3, width: rect.width * .9, height: rect.height * .4 };
}

// Measure live lettering, not the padded capsule and its bright rim. This stays
// in the DOM host; no text is rasterized or copied into the optical canvas.
export function inkElementRect(element) {
  const label = element.matches('.jb-activity') ? element.querySelector('.jb-button-face > span:last-child')
    : element.querySelector('.jb-button-face, .jb-range-value, .jb-dropdown-value, .jb-selection-label, .jb-field-label, .jb-alert-copy, .jb-table-cell-content');
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(label || element);
  const rect = range.getBoundingClientRect();
  return inkSampleRect(rect.width > 0 && rect.height > 0 ? rect : element.getBoundingClientRect());
}
