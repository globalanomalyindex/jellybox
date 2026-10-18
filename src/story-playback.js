// One bounded sampling driver serves every story figure. Its clocks count only
// visible, awake playback; compositor tracks can read time without a timer.
export function createStoryPlaybackDriver({ now = () => performance.now(), schedule = callback => setTimeout(callback, 80), cancel = clearTimeout } = {}) {
  const records = new Set();
  let awake = true, reducedMotion = false, timer = null;
  const elapsed = record => record.elapsed + (record.startedAt === null ? 0 : Math.max(0, now() - record.startedAt));
  const sameValue = (a, b) => Object.is(a, b) || (a && b && typeof a === 'object' && typeof b === 'object' && Object.keys(a).length === Object.keys(b).length && Object.keys(a).every(key => Object.is(a[key], b[key])));
  const snapshot = record => {
    const staticMode = !record.enabled || reducedMotion;
    const time = staticMode ? 0 : elapsed(record);
    return { running: record.startedAt !== null, staticMode, elapsed: time, value: record.sample?.(time, { staticMode }) };
  };
  const publish = record => {
    const next = snapshot(record), previous = record.snapshot;
    record.snapshot = next;
    if (!previous || next.running !== previous.running || next.staticMode !== previous.staticMode || !sameValue(next.value, previous.value)) record.onChange?.(next);
  };
  const manageTimer = () => {
    const needed = [...records].some(record => record.sample && record.startedAt !== null);
    if (!needed && timer !== null) { cancel(timer); timer = null; }
    if (needed && timer === null) timer = schedule(() => {
      timer = null;
      for (const record of records) if (record.sample && record.startedAt !== null) publish(record);
      manageTimer();
    });
  };
  const reconcile = record => {
    const running = record.visible && awake && record.enabled && !reducedMotion;
    if (running && record.startedAt === null) record.startedAt = now();
    else if (!running && record.startedAt !== null) { record.elapsed = elapsed(record); record.startedAt = null; }
    publish(record);
  };
  return {
    register({ sample, onChange, enabled = true } = {}) {
      const record = { sample, onChange, enabled, visible: false, elapsed: 0, startedAt: null, snapshot: null };
      records.add(record);
      reconcile(record);
      return {
        current: () => snapshot(record),
        getElapsed: () => elapsed(record),
        update(changes) {
          if (!records.has(record)) return;
          if ('visible' in changes) record.visible = Boolean(changes.visible);
          if ('enabled' in changes) record.enabled = Boolean(changes.enabled);
          if ('sample' in changes) record.sample = changes.sample;
          reconcile(record); manageTimer();
        },
        dispose() {
          record.elapsed = elapsed(record); record.startedAt = null;
          records.delete(record); manageTimer();
        },
      };
    },
    setEnvironment(changes) {
      if ('awake' in changes) awake = Boolean(changes.awake);
      if ('reducedMotion' in changes) reducedMotion = Boolean(changes.reducedMotion);
      for (const record of records) reconcile(record);
      manageTimer();
    },
    dispose() { records.clear(); if (timer !== null) cancel(timer); timer = null; },
  };
}

export function activityDemoSample(elapsed, { staticMode = false } = {}) {
  return { status: staticMode || elapsed % 6000 >= 2500 ? 'result' : 'loading' };
}

export function lampDemoSample(elapsed, { staticMode = false } = {}) {
  return { position: staticMode ? 1 : Math.floor(elapsed / 4500) % 3, height: 180, brightness: 100 };
}
