const clamp = value => Math.min(1, Math.max(0, value));

// Shared mapping, independent of React and Three. The film never disappears.
export function windowPresentation(snapshot) {
  const depth = Math.max(0, Math.min(1.06, snapshot.depth));
  const density = clamp(depth) ** 1.55;
  const visibility = clamp((depth - .12) / .88);
  return {
    depth, density,
    rimScale: .16 + depth * .84,
    gapScale: .18 + depth * .82,
    attenuationScale: 1 + (1 - density) * 1.8,
    contentOpacity: visibility * visibility * (3 - 2 * visibility),
  };
}
