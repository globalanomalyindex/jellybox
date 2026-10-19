import { DEFAULT_MATERIAL } from '../packages/react/src/renderer/material.js';

// Starting study settings; named values win over transient edits.
export const DEFAULT_EXPERIMENT = Object.freeze({ ...DEFAULT_MATERIAL, motion: .95, depth: 1, lift: 12, prism: .025, size: 1.31, spacing: 17 });
export const DEFAULT_COLORS = Object.freeze(['#5baff3', '#5baff3', '#5baff3']);
export const MOVEMENT_PRESETS = Object.freeze([
  { value: .48, label: 'Soft', description: 'A gentle drift' },
  { value: .95, label: 'Wobbly', description: 'A little extra' },
  { value: 0, label: 'Still', description: 'Hold that thought' },
]);
