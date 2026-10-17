import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseJellyInk, contrastRatio } from '../src/contrast.js';
import { activityPocket } from '../src/renderer/activity.js';
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
  assert.match(busy, /Generating.*42%/);
  const retry = renderToStaticMarkup(h(JellyActivityButton, { status: 'error' }));
  assert.match(retry, /Try again/);
  assert.doesNotMatch(retry, /disabled=""|aria-pressed=/);
  const unknown = renderToStaticMarkup(h(JellyActivityButton, { status: 'loading' }));
  assert.doesNotMatch(unknown, /data-gel-progress=|NaN|%/);
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
