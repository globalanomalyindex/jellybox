import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseJellyInk, contrastRatio } from '../src/contrast.js';
import { activityPocket, activityRelief, activityDisplacement, stepActivity, activityPigment } from '../src/renderer/activity.js';
import { MOTION, sampleBezier } from '../src/renderer/motion.js';
import { JellyActivityButton } from '../dist/index.js';

test('ink chooses passing light/dark text across the sampled surface, not mean color', () => {
  assert.equal(contrastRatio(0, 1), 21);
  assert.equal(chooseJellyInk(['#083f78', '#124d8d']).ink, '#ffffff');
  assert.ok(chooseJellyInk(['#083f78', '#124d8d']).ratio >= 4.5);
  assert.equal(chooseJellyInk(['#b8deef', '#f8fbfe']).ink, '#000000');
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
  assert.equal(chooseJellyInk(['#f1f6fa'], '#ffffff').ink, '#000000');
  assert.ok(chooseJellyInk(['#f1f6fa'], '#ffffff').ratio > 10);
  const mixed = chooseJellyInk([.06, .5], '#ffffff');
  assert.equal(mixed.ink, '#000000', 'a failing previous ink must yield to the stronger candidate');
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

const finishActivity = (state, status, duration = 2, fps = 60) => {
  const frames = Math.ceil(duration * fps), strains = [];
  for (let frame = 1; frame <= frames; frame++) {
    stepActivity(state, status, sampleBezier(MOTION.pigmentCurve, Math.min(1, frame / fps / (MOTION.pigment / 1000))), 1 / fps);
    strains.push(state.strain);
  }
  return strains;
};
test('outcomes concentrate, recoil and settle without resetting the displayed current', () => {
  for (const status of ['success', 'warning', 'error']) {
    const state = stepActivity(null, 'loading', 1, .016), angle = state.phase;
    stepActivity(state, status, 0, 0);
    assert.equal(state.gain, 1); assert.equal(state.gather, 0); assert.equal(state.phase, angle);
    const strains = finishActivity(state, status);
    assert.ok(Math.max(...strains) > .4, 'a perceptible inward compression');
    assert.ok(Math.min(...strains) < -.04, 'bounded release after the compression');
    assert.equal(state.gain, 0); assert.equal(state.gather, 1); assert.equal(state.density, 1);
    assert.equal(state.strain, 0); assert.equal(state.settling, false);
  }
});
test('material retains momentum through retry/cancel; pigment is not a second spatial fade', () => {
  const state = stepActivity(null, 'loading', 1, 0);
  stepActivity(state, 'error', 0, 0);
  finishActivity(state, 'error', .3);
  const snapshot = { ...state };
  stepActivity(state, 'loading', 0, 0);
  for (const key of ['gain','gather','density','phase','strain','gainVelocity','gatherVelocity','strainVelocity']) assert.equal(state[key], snapshot[key], key);
  finishActivity(state, 'loading');
  assert.equal(state.gain, 1); assert.equal(state.gather, 0); assert.equal(state.strain, 0);
  stepActivity(state, 'success', 0, 0);
  finishActivity(state, 'success', .5);
  assert.equal(state.sample, 1, 'the host pigment has reached its endpoint');
  assert.ok(state.settling && Math.abs(state.strain) > .01, 'material/light are still settling continuously');
  stepActivity(state, 'idle', 0, 0);
  finishActivity(state, 'idle');
  assert.equal(state.gain, 0); assert.equal(state.gather, 0); assert.equal(state.density, 0);
});
test('the same handoff stays bounded across frame rates', () => {
  for (const fps of [30, 60, 120]) {
    const state = stepActivity(null, 'loading', 1, 0);
    stepActivity(state, 'success', 0, 0);
    const strains = finishActivity(state, 'success', 2, fps);
    assert.ok(strains.every(value => value >= -.24 && value <= .85));
    assert.equal(state.energy, 0); assert.equal(state.settling, false);
  }
});
test('pause freezes ambient circulation; reduced motion removes strain immediately', () => {
  const state = stepActivity(null, 'loading', 1, .016), clock = state.clock, phase = state.phase;
  stepActivity(state, 'loading', 1, .1, { moving: false });
  assert.equal(state.clock, clock); assert.equal(state.phase, phase);
  stepActivity(state, 'success', 0, .016, { instant: true });
  assert.equal(state.gather, 1); assert.equal(state.gain, 0); assert.equal(state.strain, 0); assert.equal(state.phase, phase);
  assert.equal(state.settling, false);
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

test('the current pigment joins its semantic result on the host sample and retargets from its displayed color', () => {
  const state = activityPigment(null, 'loading', '#5baff3', 1);
  assert.equal(state.color, '#1459d1');
  activityPigment(state, 'success', '#62cf9c', 0);
  assert.equal(state.color, '#1459d1');
  activityPigment(state, 'success', '#62cf9c', .5);
  const displayed = state.color;
  activityPigment(state, 'loading', '#5baff3', 0);
  assert.equal(state.color, displayed);
  activityPigment(state, 'loading', '#5baff3', 1);
  activityPigment(state, 'error', '#f18787', 1);
  assert.equal(state.color, '#f18787', 'a settling recoil cannot reintroduce blue pigment');
});
