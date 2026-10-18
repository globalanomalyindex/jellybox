import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPigment } from '../src/renderer/activity.js';
import { createJellyPalette } from '../src/color.js';

test('loading owns a circulating film/dense pigment pair and caches its two paths', () => {
  const state = activityPigment(null, 'loading', '#5baff3', 1);
  assert.equal(state.film, '#5baff3');
  assert.equal(state.color, '#1459d1');
  assert.equal(state.filmPalette.steps, 33);
  assert.equal(state.palette.steps, 33);
  const filmPath = state.filmPalette, densePath = state.palette;
  for (let frame = 0; frame < 60; frame++) activityPigment(state, 'loading', '#5baff3', 1);
  assert.equal(state.filmPalette, filmPath);
  assert.equal(state.palette, densePath);
});

test('both current concentrations follow the host Spectral sample into exact semantic endpoints', () => {
  for (const [status, result] of [['success', '#62cf9c'], ['warning', '#edc76b'], ['error', '#f18787']]) {
    const state = activityPigment(null, 'loading', '#5baff3', 1);
    activityPigment(state, status, result, 0);
    const filmPath = state.filmPalette, densePath = state.palette;
    for (const phase of [.1, .25, .5, .8, 1]) {
      activityPigment(state, status, result, phase);
      assert.equal(state.film, createJellyPalette('#5baff3', result).sample(phase));
      assert.equal(state.color, createJellyPalette('#1459d1', result).sample(phase));
      assert.equal(state.filmPalette, filmPath);
      assert.equal(state.palette, densePath);
    }
    assert.equal(state.film, result);
    assert.equal(state.color, result, 'no blue is reintroduced during the spatial settling tail');
  }
});

test('interrupting a color gather preserves both displayed concentrations and cached paths', () => {
  const state = activityPigment(null, 'loading', '#5baff3', 1);
  activityPigment(state, 'success', '#62cf9c', 0);
  activityPigment(state, 'success', '#62cf9c', .43);
  const film = state.film, dense = state.color;
  activityPigment(state, 'error', '#f18787', 0);
  assert.equal(state.film, film);
  assert.equal(state.color, dense);
  activityPigment(state, 'error', '#f18787', .6);
  assert.equal(state.film, createJellyPalette(film, '#f18787').sample(.6));
  assert.equal(state.color, createJellyPalette(dense, '#f18787').sample(.6));
  const retryFilm = state.film, retryDense = state.color;
  activityPigment(state, 'loading', '#5baff3', 0);
  assert.equal(state.film, retryFilm);
  assert.equal(state.color, retryDense);
  activityPigment(state, 'loading', '#5baff3', 1);
  assert.equal(state.film, '#5baff3');
  assert.equal(state.color, '#1459d1');
});
