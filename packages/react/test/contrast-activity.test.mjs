import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { chooseJellyInk, contrastRatio } from '../src/contrast.js';
import { activityPocket } from '../src/renderer/activity.js';
import { JellyActivityButton } from '../dist/index.js';

test('ink chooses passing light/dark text across the sampled surface, not mean color', () => {
  assert.equal(contrastRatio(0, 1), 21);
  assert.equal(chooseJellyInk(['#083f78', '#124d8d']).ink, '#ffffff');
  assert.ok(chooseJellyInk(['#083f78', '#124d8d']).ratio >= 4.5);
  assert.equal(chooseJellyInk(['#b8deef', '#f8fbfe']).ink, '#03121e');
  assert.equal(chooseJellyInk(['#000000', '#ffffff']).halo, true);
  const broad = chooseJellyInk(['#333333', '#eeeeee']);
  assert.ok(broad.ratio < 4.5);
  assert.equal(broad.halo, true);
  assert.equal(chooseJellyInk([]).ratio, 0, 'no samples cannot certify a passing ratio');
  assert.throws(() => chooseJellyInk([NaN]), /finite/);
  assert.throws(() => chooseJellyInk(['transparent']));
});

test('a passing ink is stable, and a failing ink yields to a legible alternative', () => {
  assert.equal(chooseJellyInk(['#234a68'], '#ffffff').ink, '#ffffff');
  assert.equal(chooseJellyInk(['#f1f6fa'], '#ffffff').ink, '#03121e');
  assert.ok(chooseJellyInk(['#f1f6fa'], '#ffffff').ratio > 10);
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

test('activity travel is cyclic when indeterminate and bounded by real progress', () => {
  const first = activityPocket(180, 48, 0), loop = activityPocket(180, 48, 2.5);
  assert.ok(Math.abs(first.x - loop.x) < .0001 && Math.abs(first.y - loop.y) < .0001);
  const low = activityPocket(180, 48, 0, 10), high = activityPocket(180, 48, 0, 90);
  assert.ok(high.width > low.width);
  assert.ok(Math.abs(low.x - low.width / 2 - (high.x - high.width / 2)) < .0001, 'progress gathers from one origin');
  assert.deepEqual(activityPocket(180, 48, 0, 120), activityPocket(180, 48, 0, 100));
});
