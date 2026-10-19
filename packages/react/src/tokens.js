import { createJellyPalette } from './color.js';

/** Flat CSS swatches and authored display-RGB optical tints. */
const semantic = (label, hex, description) => Object.freeze({ label, hex, ink: '#102d43',
  rgb: Object.freeze([1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255)), description });
export const SEMANTIC_COLORS = Object.freeze({
  action: semantic('Selected', '#5baff3', 'Committed choices and primary actions.'),
  info: semantic('Highlight', '#91d2f5', 'Hover, keyboard focus and adjustment.'),
  success: semantic('Save', '#62cf9c', 'Save actions and successful outcomes.'),
  warning: semantic('Attention', '#f6bd65', 'Conditions that need attention.'),
  danger: semantic('Delete', '#f18787', 'Destructive actions and errors.'),
  neutral: semantic('Rest', '#c9e2ed', 'Clear blue glass at rest.'),
});

/** One state palette for DOM fallback and rendered material. Color is never the only signal. */
export function controlPigment(tone = 'action', state = 'rest', pigment) {
  const accent = pigment || (SEMANTIC_COLORS[tone] || SEMANTIC_COLORS.action).hex;
  const neutral = SEMANTIC_COLORS.neutral.hex;
  if (state === 'disabled') return neutral;
  if (state === 'selected' || state === 'pressed' || state === 'loading') return accent;
  const retainsPigment = Boolean(pigment) || ['success', 'danger', 'warning'].includes(tone);
  if (state === 'highlighted') return createJellyPalette(neutral, accent).sample(retainsPigment ? .88 : .58);
  return retainsPigment ? createJellyPalette(neutral, accent).sample(.68) : neutral;
}

export function colorLuminance(hex) {
  return [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255)
    .map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
}
export const JELLY_TOKENS = Object.freeze({
  font: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
  ink: '#102d43', controlInk: '#03121e', focus: '#125cf2',
  frostedFace: 'rgba(255,255,255,.28)', frostBlur: '4px',
  radius: Object.freeze({ control: '999px', surface: '30px', input: '18px' }),
  spacing: Object.freeze([4, 8, 12, 16, 24, 32]),
});

export function toneStyle(tone = 'action') {
  const color = SEMANTIC_COLORS[tone] || SEMANTIC_COLORS.action;
  return { '--jb-color': color.hex, '--jb-target-color': color.hex, '--jb-ink': color.ink, '--jb-rgb': color.rgb.map((channel) => Math.round(channel * 255)).join(' ') };
}

/** The native control owns the target; decorative carriers own its travel. */
export function materialTargetColor(style, tone) {
  const target = style.getPropertyValue('--jb-target-color').trim();
  if (/^#[0-9a-f]{6}$/i.test(target)) return target;
  if (SEMANTIC_COLORS[tone]) return SEMANTIC_COLORS[tone].hex;
  const rgb = style.getPropertyValue('--jb-rgb').trim().split(/\s+/).map(Number);
  return rgb.length === 3 && rgb.every(Number.isFinite)
    ? `#${rgb.map(c => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('')}`
    : SEMANTIC_COLORS.action.hex;
}
