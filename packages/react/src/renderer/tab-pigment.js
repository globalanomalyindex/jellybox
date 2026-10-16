import { createJellyPalette } from '../color.js';

export const createTabPigment = (from, to) => ({ palette: createJellyPalette(from, to), color: from, start: 0 });

// A color edit during a handoff starts at the pigment already on screen,
// without restarting spatial travel or retaining a stale fallback endpoint.
export function sampleTabPigment(state, target, progress) {
  if (target !== state.palette.to) {
    state.palette = createJellyPalette(state.color, target);
    state.start = progress;
  }
  const t = progress >= 1 ? 1 : (progress - state.start) / (1 - state.start);
  state.color = state.palette.sample(Math.max(0, Math.min(1, t)));
  return state.color;
}
