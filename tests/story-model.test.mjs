import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollEdgeState } from '../src/scroll-presentation.js';
import { motionLoopFrames, densityStorySample, colorStorySample } from '../src/story-examples.js';
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
    assert.deepEqual(loop.frames[0], { offset: 0, time: 0, value: 0, strain: 0 });
    const end = loop.frames[80], hold = loop.frames[120];
    assert.equal(end.offset * loop.duration, response.duration);
    assert.equal(end.time, 1);
    assert.equal(hold.offset * loop.duration - response.duration, MOTION.recoil);
    for (let i = 0; i <= 80; i++) assert.equal(loop.frames[i].value, sampleBezier(response.curve, i / 80));
    assert.deepEqual(loop.frames.at(-1), { offset: 1, time: 0, value: 0, strain: 0 });
    assert.ok(loop.frames.every((frame, index, frames) => !index || frame.offset >= frames[index - 1].offset));
    assert.ok(loop.frames.slice(121).every((frame, index, frames) => !index || frame.time <= frames[index - 1].time));
    assert.ok(loop.frames.some(frame => frame.strain > .03) && loop.frames.some(frame => frame.strain < -.02), 'material stretches and settles around its steady path');
    assert.ok(loop.frames.every(frame => Math.abs(frame.strain) <= .16));
    if (response.curve === MOTION.recoilCurve) assert.ok(loop.frames.some(frame => frame.value > 1.05), 'recoil keeps its actual overshoot');
  }
});

test('density illustrates thin and gathered structure without requiring input', () => {
  assert.deepEqual(densityStorySample(0), { strength: 45, label: 'Open film' });
  assert.deepEqual(densityStorySample(3000), { strength: 100, label: 'Gathered structure' });
  assert.deepEqual(densityStorySample(5400), { strength: 45, label: 'Open film' });
  assert.deepEqual(densityStorySample(0, { staticMode: true }), { strength: 100, label: 'Gathered structure' });
});

test('color automatically distinguishes separate, joined, preview and accepted pigment', () => {
  assert.deepEqual(colorStorySample(0), { joined: false, pending: false, mix: 50, label: 'Separate pigments' });
  assert.deepEqual(colorStorySample(2800), { joined: true, pending: false, mix: 50, label: 'Shared identity' });
  assert.deepEqual(colorStorySample(5500), { joined: true, pending: true, mix: 75, label: 'Edit preview' });
  assert.deepEqual(colorStorySample(8000), { joined: true, pending: false, mix: 75, label: 'Accepted pigment' });
  assert.deepEqual(colorStorySample(10100), colorStorySample(0));
  assert.deepEqual(colorStorySample(0, { staticMode: true }), { joined: true, pending: false, mix: 50, label: 'Shared identity' });
});
