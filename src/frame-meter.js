// Development-only frame pacing evidence; no visible UI or production work.
if (import.meta.env.DEV) {
  let handle;
  let last = 0;
  let start = 0;
  let samples = [];
  const tick = now => {
    if (document.hidden) {
      last = start = 0;
      samples = [];
    } else {
      if (!start) start = now;
      if (last) samples.push(now - last);
      last = now;
      if (now - start >= 2000 && samples.length) {
        const canvas = document.querySelector('.optical-canvas');
        if (canvas) {
          const sorted = samples.slice().sort((a, b) => a - b);
          canvas.dataset.frameRate = (1000 * samples.length / (now - start)).toFixed(1);
          canvas.dataset.frameP95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .95))].toFixed(1);
          canvas.dataset.jankRatio = (100 * samples.filter(ms => ms > 25).length / samples.length).toFixed(1);
          canvas.dataset.frameSamples = String(samples.length);
        }
        start = now;
        samples = [];
      }
    }
    handle = requestAnimationFrame(tick);
  };
  handle = requestAnimationFrame(tick);
  import.meta.hot?.dispose(() => cancelAnimationFrame(handle));
}
