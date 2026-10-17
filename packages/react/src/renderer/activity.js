export function activityPocket(width, height, seconds, progress) {
  const color = [.20, .58, .98];
  if (Number.isFinite(progress)) {
    const fraction = Math.max(0, Math.min(1, progress / 100));
    const reach = Math.max(height * .7, width * fraction * .88);
    return { x: -width * .44 + reach / 2, y: -height * .3, width: reach, height: height * .3, color };
  }
  const phase = seconds / 2.5 * Math.PI * 2;
  return { x: Math.cos(phase) * Math.max(0, width * .5 - height * .48), y: Math.sin(phase) * height * .34, width: height * .9, height: height * .36, color };
}
