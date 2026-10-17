import { colorLuminance } from './tokens.js';
import { normalizeJellyColor } from './color.js';

export const JELLY_INK = Object.freeze({ dark: '#000000', light: '#ffffff', minimum: 4.5 });
export const contrastRatio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
// Choose against the dimmest/brightest sampled parts, rather than an average
// that can hide an unreadable patch. Keep a passing ink to avoid shimmer.
export function chooseJellyInk(samples, previous) {
  const luminances = samples.map(value => {
    if (typeof value !== 'number') return colorLuminance(normalizeJellyColor(value));
    if (!Number.isFinite(value)) throw new TypeError('A contrast sample must be a finite luminance or hex color.');
    return Math.max(0, Math.min(1, value));
  });
  if (!luminances.length) return { ink: JELLY_INK.dark, ratio: 0, halo: false };
  const score = ink => Math.min(...luminances.map(l => contrastRatio(l, colorLuminance(ink))));
  const dark = score(JELLY_INK.dark), light = score(JELLY_INK.light);
  const preferred = dark >= light ? JELLY_INK.dark : JELLY_INK.light;
  const hasPrevious = previous && [JELLY_INK.dark, JELLY_INK.light].includes(previous);
  const priorScore = hasPrevious ? score(previous) : 0;
  // Stability is earned by passing. Never retain a weaker failing ink merely
  // to hide a mixed-highlight problem in the underlying reading material.
  const keep = hasPrevious && priorScore >= JELLY_INK.minimum;
  const ink = keep ? previous : preferred;
  const ratio = score(ink);
  // Retained for compatibility with 0.5.0 consumers; never outline the glyphs.
  return { ink, ratio, halo: false };
}

export function inkStyle(pigment) {
  // The CSS skin transmits the neutral receiver; raw pigment is not its final
  // background. Live optics replaces this estimate with actual pixel samples.
  const background = '#' + [1, 3, 5].map((at, i) => Math.round(parseInt(pigment.slice(at, at + 2), 16) * .42 + [244, 245, 246][i] * .58).toString(16).padStart(2, '0')).join('');
  const { ink } = chooseJellyInk([background]);
  return { '--jb-control-ink': ink, '--jb-ink': ink };
}

export function applyJellyInk(element, result) {
  if (!element?.isConnected) return;
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
