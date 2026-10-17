import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseJellyInk, contrastRatio } from '../src/contrast.js';
import { activityPocket, activityRelief, activityDisplacement, stepActivity } from '../src/renderer/activity.js';
import { MOTION } from '../src/renderer/motion.js';
import { JellyActivityButton } from '../dist/index.js';

test('ink chooses passing light/dark text across the sampled surface, not mean color', () => {
  assert.equal(contrastRatio(0, 1), 21);
  assert.equal(chooseJellyInk(['#083f78', '#124d8d']).ink, '#ffffff');
  assert.ok(chooseJellyInk(['#083f78', '#124d8d']).ratio >= 4.5);
  assert.equal(chooseJellyInk(['#b8deef', '#f8fbfe']).ink, '#03121e');
  assert.equal(chooseJellyInk(['#000000', '#ffffff']).halo, false);
  const broad = chooseJellyInk(['#333333', '#eeeeee']);
  assert.ok(broad.ratio < 4.5);
  assert.equal(broad.halo, false, 'mixed samples report their ratio without requesting outlined text');
  assert.equal(chooseJellyInk([]).ratio, 0, 'no samples cannot certify a passing ratio');
  assert.throws(() => chooseJellyInk([NaN]), /finite/);
  assert.throws(() => chooseJellyInk(['transparent']));
});

test('a passing ink is stable, and a failing ink yields to a legible alternative', () => {
  assert.equal(chooseJellyInk(['#234a68'], '#ffffff').ink, '#ffffff');
  assert.equal(chooseJellyInk(['#f1f6fa'], '#ffffff').ink, '#03121e');
  assert.ok(chooseJellyInk(['#f1f6fa'], '#ffffff').ratio > 10);
  const mixed = chooseJellyInk([.06, .5], '#ffffff');
  assert.equal(mixed.ink, '#ffffff', 'small mixed-highlight changes keep the lettering steady');
  assert.equal(mixed.halo, false);
});

test('activity is native busy/disabled, accepts reported progress, and preserves failure retry', () => {
  const busy = renderToStaticMarkup(h(JellyActivityButton, { status: 'loading', progress: 42 }));
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /disabled=""/);
  assert.match(busy, /data-gel-progress="42"/);
  assert.match(busy, /data-gel-state="loading"/);
  assert.match(busy, /Generating.*42%/);
  const retry = renderToStaticMarkup(h(JellyActivityButton, { status: 'error' }));
  assert.match(retry, /Try again/);
  assert.match(retry, /data-gel-state="selected"/);
  assert.doesNotMatch(retry, /disabled=""|aria-pressed=/);
  const unknown = renderToStaticMarkup(h(JellyActivityButton, { status: 'loading' }));
  assert.doesNotMatch(unknown, /data-gel-progress=|NaN|%/);
});

test('the activity relief reaches both capsule ends, moves across its whole body and stays bounded', () => {
  const positions = [-96, -60, 0, 60, 96];
  for (const x of positions) {
    const heights = Array.from({ length: 41 }, (_, i) => activityRelief(x, 0, activityPocket(208, 44, i / 16)));
    assert.ok(heights.every(value => value > .15 && value < 1), `filled capsule at ${x}`);
    assert.ok(Math.max(...heights) - Math.min(...heights) > .04, `travel reaches ${x}`);
  }
  const shape = activityPocket(208, 44, .6);
  assert.equal(activityRelief(110, 0, shape), 0);
  assert.equal(activityRelief(0, 26, shape), 0);
  for (let x = -104; x <= 104; x += 8) for (let y = -22; y <= 22; y += 4) {
    const shift = activityDisplacement(x, y, shape);
    assert.ok(Math.abs(shift.x) <= .45 && Math.abs(shift.y) <= 1.15 && shift.z >= 0 && shift.z <= 1.8);
  }
});

test('outcomes gather the current activity with the host pigment phase, preserving interruption', () => {
  for (const status of ['success', 'warning', 'error']) {
    const state = stepActivity(null, 'loading', 1, .016);
    const angle = state.phase;
    stepActivity(state, status, 0, 0);
    assert.equal(state.gain, 1); assert.equal(state.gather, 0); assert.equal(state.phase, angle);
    stepActivity(state, status, .4, .016);
    assert.equal(state.gather, .4); assert.equal(state.gain, .6);
    assert.equal(state.density, .64);
    const snapshot = { ...state };
    stepActivity(state, 'loading', 0, 0);
    assert.equal(state.gain, snapshot.gain); assert.equal(state.gather, snapshot.gather); assert.equal(state.phase, snapshot.phase);
    stepActivity(state, 'loading', .5, .016);
    assert.equal(state.gain, .8); assert.equal(state.gather, .2);
    stepActivity(state, status, 0, 0);
    stepActivity(state, status, 1, .016);
    assert.equal(state.gain, 0); assert.equal(state.gather, 1); assert.equal(state.density, 1);
  }
});

test('pause freezes circulation while outcomes remain meaningful; reduced motion snaps and cancel clears density', () => {
  const state = stepActivity(null, 'loading', 1, .016);
  const clock = state.clock, phase = state.phase;
  stepActivity(state, 'loading', 1, .1, { moving: false });
  assert.equal(state.clock, clock); assert.equal(state.phase, phase);
  stepActivity(state, 'success', 0, .016, { instant: true });
  assert.equal(state.gather, 1); assert.equal(state.gain, 0); assert.equal(state.phase, phase);
  stepActivity(state, 'idle', 0, 0);
  assert.equal(state.density, 1);
  stepActivity(state, 'idle', 1, .016);
  assert.equal(state.density, 0); assert.equal(state.gather, 0); assert.equal(state.gain, 0);
});

test('activity circulates through the whole body and breathes without encoding invented progress', () => {
  const first = activityPocket(180, 48, 0), loop = activityPocket(180, 48, MOTION.activityOrbit / 1000);
  assert.equal(first.width, 180); assert.equal(first.height, 48);
  assert.ok(Math.abs(Math.cos(first.phase) - Math.cos(loop.phase)) < .0001);
  assert.ok(Math.abs(Math.sin(first.phase) - Math.sin(loop.phase)) < .0001);
  assert.deepEqual(activityPocket(180, 48, 1, 10), activityPocket(180, 48, 1, 90), 'reported progress never collapses circulation into a strip');
  const breaths = Array.from({ length: 101 }, (_, i) => activityPocket(180, 48, i * MOTION.breathe / 100000).breath);
  assert.ok(Math.max(...breaths) - Math.min(...breaths) > .23);
  assert.ok(breaths.every(value => value >= .76 && value <= 1));
});
