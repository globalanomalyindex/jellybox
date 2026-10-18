import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryPlaybackDriver, activityDemoSample, lampDemoSample } from '../src/story-playback.js';
import { motionLoopFrames } from '../src/story-examples.js';
import { MOTION } from '../packages/react/src/renderer/motion.js';

test('a story resumes its visible time without catching up after leaving the screen', () => {
  let now = 0;
  const timers = new Map();
  let next = 0;
  const driver = createStoryPlaybackDriver({ now: () => now, schedule: callback => { timers.set(++next, callback); return next; }, cancel: id => timers.delete(id) });
  const playback = driver.register({});
  assert.equal(playback.current().running, false);
  playback.update({ visible: true });
  now = 800;
  assert.equal(playback.getElapsed(), 800);
  playback.update({ visible: false });
  now = 12000;
  assert.equal(playback.getElapsed(), 800);
  playback.update({ visible: true });
  now = 12400;
  assert.equal(playback.getElapsed(), 1200);
  assert.equal(timers.size, 0, 'compositor-only figures need no sampled timer');
  playback.dispose();
  driver.dispose();
});

test('the automatic activity comparison gives loading and settled outcomes readable holds', () => {
  assert.deepEqual(activityDemoSample(0), { status: 'loading' });
  assert.deepEqual(activityDemoSample(2480), { status: 'loading' });
  assert.deepEqual(activityDemoSample(2500), { status: 'result' });
  assert.deepEqual(activityDemoSample(5999), { status: 'result' });
  assert.deepEqual(activityDemoSample(6000), { status: 'loading' });
  assert.deepEqual(activityDemoSample(100, { staticMode: true }), { status: 'result' });
});

test('the ambient lamp holds placements independently and has a central static alternative', () => {
  assert.deepEqual(lampDemoSample(0), { position: 0, height: 180, brightness: 100 });
  assert.equal(lampDemoSample(4499).position, 0);
  assert.equal(lampDemoSample(4500).position, 1);
  assert.equal(lampDemoSample(9000).position, 2);
  assert.equal(lampDemoSample(13500).position, 0);
  assert.equal(lampDemoSample(9000, { staticMode: true }).position, 1);
});

test('simultaneous motion charts share a period while keeping their real response times', () => {
  for (const response of [
    { duration: MOTION.windowOpen, curve: MOTION.gather },
    { duration: MOTION.windowClose, curve: MOTION.withdraw },
    { duration: MOTION.sliderTravel, curve: MOTION.sliderTravelCurve },
    { duration: MOTION.recoil, curve: MOTION.recoilCurve },
  ]) {
    const loop = motionLoopFrames(response, 2520);
    assert.equal(loop.duration, 2520);
    assert.equal(loop.frames[80].offset * loop.duration, response.duration);
    assert.deepEqual(loop.frames.at(-1), { offset: 1, time: 0, value: 0, strain: 0 });
  }
});

test('hidden, paused and reduced-motion stories stop work and retain meaningful states', () => {
  let now = 0, callback;
  const driver = createStoryPlaybackDriver({ now: () => now, schedule: tick => { callback = tick; return 1; }, cancel: () => { callback = undefined; } });
  const playback = driver.register({ sample: activityDemoSample });
  playback.update({ visible: true });
  now = 900;
  driver.setEnvironment({ awake: false });
  assert.equal(playback.current().running, false);
  assert.equal(callback, undefined);
  now = 10900;
  driver.setEnvironment({ awake: true });
  now = 11000;
  assert.equal(playback.getElapsed(), 1000);
  playback.update({ enabled: false });
  assert.equal(playback.current().staticMode, true);
  assert.deepEqual(playback.current().value, { status: 'result' });
  assert.equal(callback, undefined);
  now = 20000;
  playback.update({ enabled: true });
  driver.setEnvironment({ reducedMotion: true });
  assert.equal(playback.current().running, false);
  assert.deepEqual(playback.current().value, { status: 'result' });
  assert.equal(callback, undefined);
  now = 30000;
  driver.setEnvironment({ reducedMotion: false });
  now = 31000;
  assert.equal(playback.getElapsed(), 2000);
  playback.dispose(); driver.dispose();
});

test('sampled stories share one bounded timer and do not publish unchanged semantic stages', () => {
  let now = 0, next = 0;
  const queue = new Map(), changes = [];
  const driver = createStoryPlaybackDriver({ now: () => now, schedule: tick => { queue.set(++next, tick); return next; }, cancel: id => queue.delete(id) });
  const first = driver.register({ sample: activityDemoSample, onChange: state => changes.push(state.value.status) });
  const second = driver.register({ sample: lampDemoSample });
  first.update({ visible: true }); second.update({ visible: true });
  assert.equal(queue.size, 1);
  const tick = time => { now = time; const [id, callback] = [...queue][0]; queue.delete(id); callback(); };
  const initial = changes.length;
  tick(80); tick(160); tick(240);
  assert.equal(changes.length, initial, 'a held label does not rerender on each clock sample');
  tick(2560);
  assert.equal(changes.at(-1), 'result');
  assert.equal(changes.length, initial + 1);
  assert.equal(queue.size, 1);
  first.dispose();
  assert.equal(queue.size, 1, 'the remaining visible figure retains the shared timer');
  second.dispose();
  assert.equal(queue.size, 0);
  now = 10000;
  assert.equal(first.getElapsed(), 2560, 'disposed playback cannot keep advancing');
  driver.dispose();
});
