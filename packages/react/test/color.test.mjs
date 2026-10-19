import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createJellyPalette, mixJellyColors } from '../src/color.js';
import { useJellyColor, useJellyToneStyle } from '../src/useMaterialColor.js';

test('opaque color normalization, exact endpoints, and bounded progress', () => {
  assert.equal(mixJellyColors(' #AbC ', '#123456', -3), '#aabbcc');
  assert.equal(mixJellyColors('#abc', '#123456', 4), '#123456');
  assert.equal(mixJellyColors('#000', '#fff', 0), '#000000');
  assert.equal(mixJellyColors('#000', '#fff', 1), '#ffffff');
  assert.equal(mixJellyColors('#abc', '#ABC', .47), '#aabbcc');
});

test('mix follows the official Spectral.js blue/yellow pigment example', () => {
  assert.equal(mixJellyColors('#002185', '#fcd200', .5), '#3d933e');
  assert.equal(mixJellyColors('#fcd200', '#002185', .5), '#3d933e');
});

test('invalid material inputs fail clearly instead of silently mixing alpha or named colors', () => {
  for (const color of ['red', '#abcd', '#12345678', '#12', '#ggg', null]) {
    assert.throws(() => mixJellyColors(color, '#fff', .5), /opaque #rgb or #rrggbb/);
  }
  for (const value of [NaN, Infinity, '0.5']) assert.throws(() => mixJellyColors('#000', '#fff', value), /finite number/);
  for (const steps of [1, 2.5, 258, Infinity]) assert.throws(() => createJellyPalette('#000', '#fff', steps), /sample count/);
});

test('shared immutable palettes retain exact spectral samples and renderer-ready sRGB values', () => {
  const palette = createJellyPalette('#002185', '#fcd200');
  assert.strictEqual(createJellyPalette('#002185', '#FCD200', 33), palette);
  assert.ok(Object.isFrozen(palette));
  assert.ok(Object.isFrozen(palette.colors));
  assert.equal(palette.colors.length, 33);
  assert.equal(palette.sample(0), '#002185');
  assert.equal(palette.sample(1), '#fcd200');
  assert.equal(palette.sample(.5), mixJellyColors('#002185', '#fcd200', .5));
  assert.deepEqual(palette.sampleRGB(0), [0, 33 / 255, 133 / 255]);
  const output = [0, 0, 0];
  assert.strictEqual(palette.sampleRGB(.43, output), output);
  assert.ok(output.every((channel) => Number.isFinite(channel) && channel >= 0 && channel <= 1));
  output[0] = 99;
  assert.notEqual(palette.sampleRGB(.43)[0], 99, 'consumer scratch arrays cannot mutate cached palette');
});

test('adjacent cached samples interpolate continuously and interruption retains current color', () => {
  const palette = createJellyPalette('#054af3', '#abe800');
  const boundary = 8 / 32;
  const before = palette.sampleRGB(boundary - .000001);
  const after = palette.sampleRGB(boundary + .000001);
  assert.ok(before.every((channel, index) => Math.abs(channel - after[index]) < .0001));
  const interrupted = palette.sample(.37);
  const next = createJellyPalette(interrupted, '#f35b5b');
  assert.equal(next.sample(0), interrupted);
  assert.equal(next.sample(1), '#f35b5b');
});

test('finite palette cache evicts old entries without changing their value', () => {
  const oldest = createJellyPalette('#123456', '#abcdef');
  for (let index = 0; index < 65; index += 1) createJellyPalette(`#${index.toString(16).padStart(6, '0')}`, '#ffffff', 2);
  const recreated = createJellyPalette('#123456', '#abcdef');
  assert.notStrictEqual(recreated, oldest);
  assert.deepEqual(recreated.colors, oldest.colors);
});

test('material color hook is SSR-safe and starts at the requested target', () => {
  function Material() {
    const color = useJellyColor('#AbC');
    return h('span', { style: { backgroundColor: color } }, 'State is immediate');
  }
  assert.equal(renderToStaticMarkup(h(Material)), '<span style="background-color:#aabbcc">State is immediate</span>');
});

test('tone hook supplies material channels and a legible fallback ink while preserving content', () => {
  function Status() {
    return h('span', { style: useJellyToneStyle('danger') }, 'Failed');
  }
  const html = renderToStaticMarkup(h(Status));
  assert.match(html, /--jb-color:#f18787/);
  assert.match(html, /--jb-rgb:241 135 135/);
  assert.match(html, /--jb-ink:#000000/);
  assert.match(html, /--jb-control-ink:#000000/);
  assert.match(html, />Failed<\/span>/);
});

test('semantic state palette retains strong dark-text contrast and a distinct hover', async () => {
  const { SEMANTIC_COLORS, controlPigment, colorLuminance } = await import('../src/tokens.js');
  const contrast = (a, b) => (Math.max(colorLuminance(a), colorLuminance(b)) + .05) / (Math.min(colorLuminance(a), colorLuminance(b)) + .05);
  assert.equal(contrast('#000000', '#ffffff'), 21, 'WCAG reference pair');
  for (const tone of Object.keys(SEMANTIC_COLORS)) {
    for (const state of ['rest', 'highlighted', 'selected', 'pressed']) {
      assert.ok(contrast('#03121e', controlPigment(tone, state)) >= 4.5, `${tone} ${state}`);
    }
  }
  assert.notEqual(controlPigment('action', 'rest'), controlPigment('action', 'highlighted'));
  assert.notEqual(controlPigment('action', 'highlighted'), controlPigment('action', 'selected'));
});
test('the window keeps finite transmission for zero-channel pigments without changing control pigments', async () => {
  const { windowPigment, surfacePigment } = await import('../src/renderer/surface-color.js');
  assert.deepEqual(windowPigment([0, 0, 0]), [.2, .2, .2], 'black remains dense at the rim but cannot extinguish the thin reading film');
  assert.deepEqual(windowPigment([0, .5, 1]), [.2, .5, 1], 'only extinction-prone channels need an optical floor');
  assert.deepEqual(windowPigment([.4, .6, .8]), [.4, .6, .8], 'ordinary clear pigments are unchanged');
  assert.deepEqual(surfacePigment([0, 0, 0], 'control'), [0, 0, 0], 'the selected control keeps its exact pigment');
});

test('explicit pigments remain visible at rest without a hover to reveal the chosen color', async () => {
  const { controlPigment, SEMANTIC_COLORS } = await import('../src/tokens.js');
  const rest = controlPigment('action', 'rest', '#dd3c88');
  const hover = controlPigment('action', 'highlighted', '#dd3c88');
  assert.notEqual(rest, SEMANTIC_COLORS.neutral.hex, 'a chosen pigment must survive the resting state');
  assert.notEqual(rest, hover, 'approach still gathers more pigment');
  assert.equal(controlPigment('action', 'selected', '#dd3c88'), '#dd3c88');
  assert.equal(controlPigment('action', 'disabled', '#dd3c88'), SEMANTIC_COLORS.neutral.hex);
  assert.equal(controlPigment('action', 'rest'), SEMANTIC_COLORS.neutral.hex, 'unpigmented actions keep their neutral rest');
});
