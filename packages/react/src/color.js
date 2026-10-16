import spectral from 'spectral.js';

// A pigment-inspired display-color path. This does not model transmission,
// transparent-jelly optics, illumination, or semantic foreground contrast.
const colorCache = new Map();
const paletteCache = new Map();
const COLOR_LIMIT = 128;
const PALETTE_LIMIT = 64;

function cached(cache, key, create, limit) {
  if (cache.has(key)) {
    const value = cache.get(key);
    cache.delete(key);
    cache.set(key, value);
    return value;
  }
  const value = create();
  cache.set(key, value);
  if (cache.size > limit) cache.delete(cache.keys().next().value);
  return value;
}

export function normalizeJellyColor(value) {
  if (typeof value !== 'string' || !/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim())) {
    throw new TypeError('JellyBox material colors must be opaque #rgb or #rrggbb hex strings.');
  }
  const hex = value.trim().toLowerCase();
  return hex.length === 4 ? `#${[...hex.slice(1)].map((channel) => channel + channel).join('')}` : hex;
}

function progress(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('JellyBox color progress must be a finite number.');
  return Math.min(1, Math.max(0, value));
}

function pigment(hex) {
  return cached(colorCache, hex, () => new spectral.Color(hex), COLOR_LIMIT);
}

function mix(from, to, t) {
  if (t === 0 || from === to) return from;
  if (t === 1) return to;
  return spectral.mix([pigment(from), 1 - t], [pigment(to), t]).toString().toLowerCase();
}

/** Exact Spectral.js pigment mix; material colors only, with exact endpoints. */
export function mixJellyColors(from, to, t) {
  return mix(normalizeJellyColor(from), normalizeJellyColor(to), progress(t));
}

function hexRGB(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255);
}

function rgbHex(rgb) {
  return `#${rgb.map((channel) => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Bounded, shared palette cache. Sampling linearly interpolates adjacent
 * precomputed pigment samples, doing no spectral solve inside animation frames.
 * sampleRGB returns normalized DISPLAY sRGB, not linear-light RGB. Renderers
 * using linear working colors must convert it at their color-space boundary.
 */
export function createJellyPalette(from, to, steps = 33) {
  from = normalizeJellyColor(from);
  to = normalizeJellyColor(to);
  if (!Number.isInteger(steps) || steps < 2 || steps > 257) {
    throw new RangeError('JellyBox palettes require an integer sample count from 2 to 257.');
  }
  return cached(paletteCache, `${from}:${to}:${steps}`, () => {
    const colors = Object.freeze(Array.from({ length: steps }, (_, index) => mix(from, to, index / (steps - 1))));
    const rgb = colors.map(hexRGB);
    const sampleRGB = (t, out = [0, 0, 0]) => {
      const position = progress(t) * (steps - 1);
      const lower = Math.floor(position);
      const upper = Math.min(steps - 1, lower + 1);
      const fraction = position - lower;
      for (let index = 0; index < 3; index += 1) {
        out[index] = rgb[lower][index] + (rgb[upper][index] - rgb[lower][index]) * fraction;
      }
      return out;
    };
    return Object.freeze({ from, to, steps, colors, sample: (t) => rgbHex(sampleRGB(t)), sampleRGB });
  }, PALETTE_LIMIT);
}
