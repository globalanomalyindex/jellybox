import { colorLuminance } from './tokens.js';
import { normalizeJellyColor } from './color.js';

export const JELLY_INK = Object.freeze({ dark: '#03121e', light: '#ffffff', minimum: 4.5 });
export const contrastRatio = (a, b) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
// Choose against the dimmest/brightest sampled parts, rather than an average
// that can hide an unreadable patch. Keep a passing ink to avoid shimmer.
export function chooseJellyInk(samples, previous) {
  const luminances = samples.map(value => {
    if (typeof value !== 'number') return colorLuminance(normalizeJellyColor(value));
    if (!Number.isFinite(value)) throw new TypeError('A contrast sample must be a finite luminance or hex color.');
    return Math.max(0, Math.min(1, value));
  });
  if (!luminances.length) return { ink: JELLY_INK.dark, ratio: 0, halo: true };
  const score = ink => Math.min(...luminances.map(l => contrastRatio(l, colorLuminance(ink))));
  const dark = score(JELLY_INK.dark), light = score(JELLY_INK.light);
  const preferred = dark >= light ? JELLY_INK.dark : JELLY_INK.light;
  const hasPrevious = previous && [JELLY_INK.dark, JELLY_INK.light].includes(previous);
  const priorScore = hasPrevious ? score(previous) : 0;
  // Mixed moving highlights can put both inks below the target. Let the glyph
  // guard handle small variations instead of flickering between two poor inks.
  const keep = hasPrevious && (priorScore >= JELLY_INK.minimum || Math.max(dark, light) < JELLY_INK.minimum && Math.max(dark, light) - priorScore < .75);
  const ink = keep ? previous : preferred;
  const ratio = score(ink);
  return { ink, ratio, halo: ratio < JELLY_INK.minimum };
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
  const opposite = result.ink === JELLY_INK.dark ? '#fff' : '#03121e';
  const halo = result.halo ? `0 1px 0 ${opposite}, 0 -1px 0 ${opposite}, 1px 0 0 ${opposite}, -1px 0 0 ${opposite}` : 'none';
  if (element.style.getPropertyValue('--jb-rendered-ink') !== result.ink) element.style.setProperty('--jb-rendered-ink', result.ink);
  if (element.style.getPropertyValue('--jb-ink-halo') !== halo) element.style.setProperty('--jb-ink-halo', halo);
  if (element.style.getPropertyValue('--jb-ink-edge') !== opposite) element.style.setProperty('--jb-ink-edge', opposite);
  element.dataset.gelInk = result.ink === JELLY_INK.dark ? 'dark' : 'light';
  element.dataset.gelContrast = result.ratio.toFixed(2);
  element.dataset.gelInkGuard = String(result.halo);
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
