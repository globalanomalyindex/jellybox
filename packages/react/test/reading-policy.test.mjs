import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseJellyInk, inkStyle, jellyReadingInk, applyJellyInk, clearJellyInk } from '../src/contrast.js';
import { SEMANTIC_COLORS } from '../src/tokens.js';

test('transmitting material uses dark ink when both polarities pass, regardless of earlier white', () => {
  const reading = chooseJellyInk([.18, .18], '#ffffff');
  assert.equal(reading.ink, '#000000');
  assert.ok(reading.ratio >= 4.5);
  assert.equal(chooseJellyInk(['#082846'], '#000000').ink, '#ffffff', 'unconstrained dark skins still support white');
});

test('authored ink remains steady while actual highlight samples report their weakest contrast', () => {
  const dark = chooseJellyInk([.06, .5], '#ffffff', { preferred: '#000' });
  assert.equal(dark.ink, '#000000');
  assert.ok(Math.abs(dark.ratio - 2.2) < .000001, 'a reading-film failure is not promoted into a passing ratio');
  const white = chooseJellyInk(['#ffffff'], '#000000', { preferred: '#FFF' });
  assert.equal(white.ink, '#ffffff');
  assert.equal(white.ratio, 1);
  assert.equal(white.halo, false);
  assert.deepEqual(chooseJellyInk([], undefined, { preferred: '#fff' }), { ink: '#ffffff', ratio: 0, halo: false });
  assert.throws(() => chooseJellyInk([.2], undefined, { preferred: '#f00' }), /solid black or white/);
});

test('semantic skins publish one independent reading intent before any optional renderer exists', () => {
  for (const pigment of [...Object.values(SEMANTIC_COLORS).map(tone => tone.hex), '#000', '#fff', '#04164b']) {
    const skin = inkStyle(pigment);
    assert.equal(skin['--jb-reading-ink'], '#000000');
    assert.equal(skin['--jb-control-ink'], skin['--jb-reading-ink']);
    assert.equal(skin['--jb-ink'], skin['--jb-reading-ink']);
  }
});

const nativeInkHost = (intent = '#000000') => {
  const values = new Map();
  const element = {
    isConnected: true, dataset: {},
    style: {
      getPropertyValue: name => values.get(name) || '',
      setProperty: (name, value) => values.set(name, value),
      removeProperty: name => values.delete(name),
    },
    hasAttribute: name => name === 'data-gel-ink' && 'gelInk' in element.dataset,
    ownerDocument: { defaultView: { getComputedStyle: () => ({ getPropertyValue: name => name === '--jb-reading-ink' ? intent : '#ffffff' }) } },
  };
  return { element, setIntent: value => { intent = value; } };
};

test('native ink reads independent intent and never feeds the sampled output back into its decision', () => {
  const host = nativeInkHost();
  host.element.style.setProperty('--jb-rendered-ink', '#ffffff');
  assert.equal(jellyReadingInk(host.element), '#000000');
  host.setIntent(' #FFF ');
  assert.equal(jellyReadingInk(host.element), '#ffffff');
  host.setIntent('');
  assert.equal(jellyReadingInk(host.element), '#000000');
  assert.equal(jellyReadingInk(undefined), '#000000');
});

test('a stale asynchronous opposite-polarity result yields to current native intent', () => {
  const host = nativeInkHost('#fff'), element = host.element;
  applyJellyInk(element, { ink: '#ffffff', ratio: 6, halo: false });
  assert.equal(element.dataset.gelInk, 'light');
  host.setIntent('#000');
  applyJellyInk(element, { ink: '#ffffff', ratio: 7, halo: false });
  assert.equal(element.style.getPropertyValue('--jb-rendered-ink'), '');
  assert.equal(element.dataset.gelInk, undefined);
  assert.equal(element.dataset.gelContrast, undefined, 'old samples cannot verify the new intended ink');
  applyJellyInk(element, { ink: '#000000', ratio: 5.6, halo: false });
  assert.equal(element.style.getPropertyValue('--jb-rendered-ink'), '#000000');
  assert.equal(element.dataset.gelContrast, '5.60');
  clearJellyInk(element);
  assert.equal(element.style.getPropertyValue('--jb-rendered-ink'), '');
});

test('detached native controls ignore late readback publication', () => {
  const { element } = nativeInkHost(); element.isConnected = false;
  applyJellyInk(element, { ink: '#000000', ratio: 5.6, halo: false });
  assert.deepEqual(element.dataset, {});
  assert.equal(element.style.getPropertyValue('--jb-rendered-ink'), '');
});
