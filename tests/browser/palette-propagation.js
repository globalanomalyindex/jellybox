async (page) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const study = new URL(page.url());
  study.hash = '';
  await page.goto(study.href);
  await page.waitForFunction(() => document.documentElement.classList.contains('optics-ready'));
  const tools = page.getByRole('region', { name: 'Interactive JellyBox material experiment', exact: true });
  await tools.getByRole('button', { name: 'Color', exact: true }).click();
  await page.getByRole('button', { name: 'Candy', exact: true }).click();
  await tools.getByRole('button', { name: 'Close Color panel', exact: true }).click();
  // Never approach a tool after committing: hover must not repair its pigment.
  await page.mouse.move(1380, 20);
  await page.waitForTimeout(1600);
  const bounds = await tools.getByRole('button', { name: 'Explore', exact: true }).boundingBox();
  const screenshot = await page.screenshot();
  const sample = await page.evaluate(async ({ png, bounds }) => {
    const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width; canvas.height = bitmap.height;
    const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0);
    const scale = bitmap.width / innerWidth;
    const patch = context.getImageData(Math.round((bounds.x + bounds.width * .5) * scale) - 3, Math.round((bounds.y + bounds.height * .84) * scale) - 3, 7, 7).data;
    const rgb = [0, 0, 0];
    for (let i = 0; i < patch.length; i += 4) for (let channel = 0; channel < 3; channel++) rgb[channel] += patch[i + channel] / 49;
    bitmap.close(); return rgb.map(Math.round);
  }, { png: screenshot.toString('base64'), bounds });
  // Candy's magenta has stronger red and blue than green; neutral blue does not.
  if (sample[0] - sample[1] < 25 || sample[2] - sample[1] < 20) throw new Error(`Candy's resting Explore button stayed blue until hover: sampled RGB ${sample.join(', ')}`);
  return { pass: true, restingExplore: sample };
}
