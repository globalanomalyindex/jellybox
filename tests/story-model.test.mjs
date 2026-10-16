import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollEdgeState } from '../src/scroll-presentation.js';
import { motionLoopFrames, colorGroupState, taskSample } from '../src/story-examples.js';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';

const reading = { viewportHeight: 720, documentHeight: 5000, scroll: 1000, storyTop: -200, credits: { top: -500, bottom: -400 } };
test('returning to the hero clears the cue even when more content remains', () => {
  assert.ok(scrollEdgeState(reading).strength > 0);
  const hero = scrollEdgeState({ ...reading, scroll: 0, storyTop: 800, credits: { top: 480, bottom: 648 } });
  assert.equal(hero.strength, 0);
  assert.equal(hero.active, false);
  assert.equal(hero.more, true);
  assert.equal(scrollEdgeState({ ...reading, scroll: 100, storyTop: 750 }).strength, 0);
});
test('the reading cue protects content, preferences and the end of the document', () => {
  assert.equal(scrollEdgeState({ ...reading, protected: true }).strength, 0);
  assert.equal(scrollEdgeState({ ...reading, transparent: true }).strength, 0);
  assert.equal(scrollEdgeState({ ...reading, credits: { top: 630, bottom: 715 } }).strength, 0);
  const end = scrollEdgeState({ ...reading, scroll: 4280 });
  assert.equal(end.more, false);
  assert.equal(end.strength, 0);
});

test('explanatory loops preserve the real response duration, hold, and close their seam', () => {
  for (const response of [{ duration: MOTION.windowOpen, curve: MOTION.gather }, { duration: MOTION.recoil, curve: MOTION.recoilCurve }]) {
    const loop = motionLoopFrames(response);
    assert.deepEqual(loop.frames[0], { offset: 0, time: 0, value: 0 });
    const end = loop.frames[80], hold = loop.frames[81];
    assert.equal(end.offset * loop.duration, response.duration);
    assert.equal(end.time, 1);
    assert.equal(hold.offset * loop.duration - response.duration, 800);
    for (let i = 0; i <= 80; i++) assert.equal(loop.frames[i].value, sampleBezier(response.curve, i / 80));
    assert.deepEqual(loop.frames.at(-1), { offset: 1, time: 0, value: 0 });
    assert.ok(loop.frames.every((frame, index, frames) => !index || frame.offset >= frames[index - 1].offset));
    assert.ok(loop.frames.slice(82).every((frame, index, frames) => !index || frame.time <= frames[index - 1].time));
  }
});

test('group previews retain accepted membership until explicit update or separation', () => {
  const original = { pair: 0, mix: 50 };
  assert.equal(colorGroupState(original, null).joined, false);
  const accepted = { ...original };
  assert.equal(colorGroupState(original, accepted).dirty, false);
  const preview = { pair: 1, mix: 75 };
  assert.deepEqual(colorGroupState(preview, accepted), { dirty: true, joined: true, label: 'Joined · changes pending' });
  assert.deepEqual(accepted, original);
  assert.equal(colorGroupState({ ...accepted }, accepted).dirty, false);
  assert.equal(colorGroupState(preview, { ...preview }).label, 'Joined · 2 items');
  assert.equal(colorGroupState(preview, null).joined, false);
});

test('the state demonstration reports progress before its selected outcome', () => {
  for (const outcome of ['success', 'warning', 'error']) {
    assert.deepEqual(taskSample(1200, outcome), { progress: 50, status: 'loading' });
    assert.deepEqual(taskSample(2400, outcome), { progress: 100, status: outcome });
    assert.deepEqual(taskSample(5000, outcome), { progress: 100, status: outcome });
  }
  assert.equal(taskSample(2400, 'unrecognized').status, 'error');
});
