// Display-space relief, shared by every rounded optical surface. Small controls
// have a full lens; reading surfaces keep a quieter crown inside the same lip.
export function volumeFullness(kind, grouped = false) {
  if (grouped) return .68;
  if (kind === 'window') return .08;
  if (kind === 'table' || kind === 'row' || kind === 'alert') return .42;
  if (kind === 'menu') return .68;
  return 1;
}

export function volumeCrown(distance, halfShort) {
  const edge = 1 - Math.min(1, Math.max(0, distance) / Math.max(1, halfShort));
  return Math.sqrt(Math.max(0, 1 - edge * edge));
}

export function volumeHeight(core, depth, rim, roll, crown, fullness) {
  const relief = Math.max(0, depth - core);
  return (core + relief * (crown * fullness + rim * (1 - fullness * .78))) * roll;
}
