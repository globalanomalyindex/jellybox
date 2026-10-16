import { createJellyPalette } from '../color.js';

// Structure is clear water; pigment is reserved for an active choice or status.
// Cached Spectral palettes keep color transport shared with the main controls.
export const CLEAR_JELLY = '#d7edf3';

// A zero absorption-tint channel extinguishes even a very thin film. Keep the
// main window's optical tint finite: its thin center transmits the pale receiver
// while the long path through the dense rim can still become dark. This is an
// authored reading constraint, applied after pigment sampling in display sRGB.
export function windowPigment(color, output = [0, 0, 0]) {
  for (let i = 0; i < 3; i++) output[i] = Math.max(.2, color[i]);
  return output;
}

export function surfacePigmentWeight(kind, selected = false, grouped = false) {
  if (kind === 'menu') return .38;
  if (kind === 'table' || kind === 'track') return .20;
  if (kind === 'row') return selected ? .72 : .025;
  if (kind === 'option') return grouped ? .04 : selected ? .72 : .04;
  return 1;
}
export function surfacePigment(color, kind, selected, grouped, output = [0, 0, 0]) {
  const weight = surfacePigmentWeight(kind, selected, grouped);
  if (weight === 1) { for (let i = 0; i < 3; i++) output[i] = color[i]; return output; }
  const hex = `#${color.map(channel => Math.round(Math.max(0, Math.min(1, channel)) * 255).toString(16).padStart(2, '0')).join('')}`;
  createJellyPalette(CLEAR_JELLY, hex).sampleRGB(weight, output);
  return output;
}
