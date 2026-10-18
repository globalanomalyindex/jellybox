import test from 'node:test';
import assert from 'node:assert/strict';
import { activityPigment, activityPigmentPhase } from '../src/renderer/activity.js';
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

test('one host phase lets the dense current arrive before the film, with exact semantic endpoints', () => {
  for (const [status, result] of [['success', '#62cf9c'], ['warning', '#edc76b'], ['error', '#f18787']]) {
    const state = activityPigment(null, 'loading', '#5baff3', 1);
    activityPigment(state, status, result, 0);
    const filmPath = state.filmPalette, densePath = state.palette;
    for (const [phase, filmPhase, densePhase] of [[.1, 0, .2701], [.25, 0, .604375], [.5, .0275, .9725], [.8, .4976, 1], [1, 1, 1]]) {
      activityPigment(state, status, result, phase);
      assert.equal(state.film, createJellyPalette('#5baff3', result).sample(filmPhase));
      assert.equal(state.color, createJellyPalette('#1459d1', result).sample(densePhase));
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
  assert.equal(state.film, createJellyPalette(film, '#f18787').sample(.1464));
  assert.equal(state.color, '#f18787');
  const retryFilm = state.film, retryDense = state.color;
  activityPigment(state, 'loading', '#5baff3', 0);
  assert.equal(state.film, retryFilm);
  assert.equal(state.color, retryDense);
  activityPigment(state, 'loading', '#5baff3', 1);
  assert.equal(state.film, '#5baff3');
  assert.equal(state.color, '#1459d1');
});

test('result pigment arrives through collected jelly before the uncollected film', () => {
  const film = activityPigmentPhase(.5, .15);
  const crest = activityPigmentPhase(.5, .85);
  assert.ok(crest - film > .5, 'dense moving crests carry the result ahead of the surrounding loading film');
  assert.ok(film < .3 && crest > .7, 'the middle of collection visibly contains old and new material together');
  for (const concentration of [0, .15, .5, .85, 1]) {
    assert.equal(activityPigmentPhase(0, concentration), 0);
    assert.equal(activityPigmentPhase(1, concentration), 1);
    let previous = 0;
    for (let step = 0; step <= 20; step++) {
      const value = activityPigmentPhase(step / 20, concentration);
      assert.ok(value >= previous && value >= 0 && value <= 1);
      previous = value;
    }
  }
});
