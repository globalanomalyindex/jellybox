import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as library from '../dist/index.js';
import { selectionKeyIndex, selectionTabIndex } from '../src/selection.js';

const render = (Component, props, children) => renderToStaticMarkup(h(Component, props, children));
const options = [
  { value: 'calm', label: 'Calm' }, { value: 'disabled', label: 'Unavailable', disabled: true }, { value: 'playful', label: 'Playful' },
];

test('core exposes sixteen components and renders without the Three entry', async () => {
  const expected = ['JellyButton', 'JellySelectionGroup', 'JellySurface', 'JellySlider', 'JellySwitch', 'JellyInput', 'JellyBadge', 'JellyAlert', 'JellySkeleton', 'JellyTabs', 'JellyDropdown', 'JellyCheckbox', 'JellyDialog', 'JellyTable', 'JellyWindow', 'JellyLink'];
  expected.forEach((name) => assert.ok(library[name], name));
  assert.equal(library.JellyScene, undefined);
  const seen = new Set();
  const checkGraph = async (url) => {
    if (seen.has(url.href)) return;
    seen.add(url.href);
    const source = await readFile(url, 'utf8');
    assert.doesNotMatch(source, /(?:from\s*|import\s*)["']three(?:\/|["'])/, 'core dependency graph must not import Three');
    for (const match of source.matchAll(/(?:from\s*|import\s*)["'](\.\/[^"']+\.js)["']/g)) await checkGraph(new URL(match[1], url));
  };
  await checkGraph(new URL('../dist/index.js', import.meta.url));
  const html = renderToStaticMarkup(h(library.JellySurface, {},
    h(library.JellyButton, {}, 'Save'), h(library.JellySelectionGroup, { options, value: 'calm', 'aria-label': 'Movement' }),
    h(library.JellySlider, { label: 'Light' }), h(library.JellySwitch, { label: 'Motion' }),
    h(library.JellyInput, { label: 'Name' }), h(library.JellyBadge, {}, 'Ready'),
    h(library.JellyAlert, { title: 'Saved' }, 'Your change is saved.'), h(library.JellySkeleton, { lines: 2 })));
  assert.match(html, /data-gel-panel/);
  assert.match(html, /Movement/);
  assert.match(html, /Loading content/);
});

test('button defaults to non-submitting native behavior and loading preserves its label', () => {
  const html = render(library.JellyButton, { loading: true, name: 'save' }, 'Save changes');
  assert.match(html, /type="button"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Save changes/);
});

test('radio navigation wraps, skips disabled options, and respects RTL', () => {
  assert.equal(selectionTabIndex(options, 'playful'), 2);
  assert.equal(selectionTabIndex(options, 'disabled'), 0);
  assert.equal(selectionTabIndex(options, 'calm', true), -1);
  assert.equal(selectionKeyIndex(options, 0, 'ArrowRight'), 2);
  assert.equal(selectionKeyIndex(options, 2, 'ArrowDown'), 0);
  assert.equal(selectionKeyIndex(options, 0, 'ArrowLeft'), 2);
  assert.equal(selectionKeyIndex(options, 0, 'ArrowRight', { dir: 'rtl' }), 2);
  assert.equal(selectionKeyIndex(options, 2, 'Home'), 0);
  assert.equal(selectionKeyIndex(options, 0, 'End'), 2);
  assert.equal(selectionKeyIndex(options, 0, ' '), -1);
  assert.equal(selectionKeyIndex(options.map((option) => ({ ...option, disabled: true })), 0, 'End'), -1);
});

test('selection markup has one fallback contour, stable hooks, and one tab stop', () => {
  const html = render(library.JellySelectionGroup, { id: 'movement', name: 'movement', value: 'playful', options, 'aria-label': 'Movement' });
  assert.equal((html.match(/jb-selection-contour/g) || []).length, 1);
  assert.equal((html.match(/tabindex="0"/g) || []).length, 1);
  assert.equal((html.match(/aria-checked="true"/g) || []).length, 1);
  assert.match(html, /data-gel-group="movement"/);
  assert.match(html, /data-gel-key="string:playful"/);
  assert.match(html, /type="hidden" name="movement" value="playful"/);
  const numeric = render(library.JellySelectionGroup, { value: 0, options: [{ value: 0, label: 'Zero' }, { value: 1, label: 'One', render: ({ selected }) => h('span', {}, selected ? 'Chosen' : 'Other') }] });
  assert.match(numeric, /data-gel-key="number:0"/);
  assert.match(numeric, /Other/);
});

test('custom selection content retains ReactNode labels as accessible names', () => {
  const html = render(library.JellySelectionGroup, {
    id: 'custom-movement', value: 'calm', 'aria-label': 'Movement',
    options: [
      { value: 'calm', label: h('strong', {}, 'Calm'), render: () => h('span', { 'aria-hidden': true }, '◇') },
      { value: 'playful', label: h('span', {}, 'Playful'), content: h('span', { 'aria-hidden': true }, '○') },
    ],
  });
  assert.match(html, /aria-labelledby="custom-movement-label-0"/);
  assert.match(html, /class="jb-visually-hidden" id="custom-movement-label-0"><strong>Calm<\/strong>/);
  assert.match(html, /aria-labelledby="custom-movement-label-1"/);
  assert.match(html, /class="jb-visually-hidden" id="custom-movement-label-1"><span>Playful<\/span>/);
});

test('native fields forward form attributes and associate label/help/error', () => {
  const slider = render(library.JellySlider, { id: 'light', name: 'light', label: 'Light', min: 10, max: 40, disabled: true });
  assert.match(slider, /type="range"/);
  assert.match(slider, /name="light"/);
  assert.match(slider, /value="10"/);
  assert.match(slider, /for="light"/);
  const controlled = render(library.JellySlider, { label: 'Light', value: 25, defaultValue: 10, onChange() {} });
  assert.match(controlled, /value="25"/);
  assert.match(controlled, /<span id="[^"]+-value">25<\/span>/);
  const toggle = render(library.JellySwitch, { id: 'motion', name: 'motion', label: 'Motion', defaultChecked: true, value: 'enabled' });
  assert.match(toggle, /type="checkbox" role="switch"/);
  assert.match(toggle, /checked=""/);
  assert.match(toggle, /name="motion"/);
  const input = render(library.JellyInput, { id: 'email', name: 'email', type: 'email', label: 'Email', description: 'Use your work email', error: 'Enter a valid email', 'aria-describedby': 'extra' });
  assert.match(input, /aria-invalid="true"/);
  assert.match(input, /aria-describedby="extra email-description email-error"/);
  assert.match(input, /for="email"/);
});

test('alert urgency is explicit, independent of semantic tone', () => {
  assert.match(render(library.JellyAlert, { tone: 'danger' }, 'Error'), /role="note" aria-live="off"/);
  assert.match(render(library.JellyAlert, { tone: 'success', live: 'assertive' }, 'Saved'), /role="alert" aria-live="assertive"/);
  assert.match(render(library.JellyAlert, { live: 'polite', dismissible: true }, 'Saved'), /role="status"/);
});

test('skeleton status can announce loading without a permanently busy subtree', () => {
  const html = render(library.JellySkeleton, { label: 'Loading files', lines: 2, animated: false });
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /aria-busy=/);
  assert.match(html, /class="jb-visually-hidden">Loading files<\/span>/);
  assert.match(html, /aria-hidden="true" class="jb-skeleton-lines"/);
  assert.match(html, /jb-skeleton-still/);
});

test('semantic roles and shared defaults stay explicit and immutable', () => {
  assert.deepEqual(Object.keys(library.SEMANTIC_COLORS), ['action', 'info', 'success', 'warning', 'danger', 'neutral']);
  assert.deepEqual(library.DEFAULT_MATERIAL, { motion: .48, transmission: .06, light: .25 });
  assert.equal(library.MOTION.flow, 420);
  assert.equal(library.MOTION.material, 240);
  for (const color of Object.values(library.SEMANTIC_COLORS)) {
    assert.match(color.hex, /^#[0-9a-f]{6}$/i);
    assert.equal(color.rgb.length, 3);
    assert.ok(color.rgb.every((channel) => channel >= 0 && channel <= 1));
    assert.ok(Object.isFrozen(color));
  }
});

test('typed selection identities remain distinct for numeric and string values', () => {
  const options = [{ value: 1, label: 'Number' }, { value: '1', label: 'String' }];
  for (const [Component, prop] of [[library.JellySelectionGroup, 'options'], [library.JellyTabs, 'items']]) {
    const html = render(Component, { [prop]: options, value: '1' });
    assert.match(html, /data-gel-key="number:1"/);
    assert.match(html, /data-gel-key="string:1"/);
  }
});

test('selection controls distinguish clear rest from selected pigment without changing labels', () => {
  const rest = render(library.JellyButton, { tone: 'action', selected: false }, 'Explore');
  const selected = render(library.JellyButton, { tone: 'action', selected: true }, 'Explore');
  assert.match(rest, /data-gel-state="rest"/);
  assert.match(selected, /data-gel-state="selected"/);
  assert.notEqual(rest.match(/--jb-color:([^;]+)/)?.[1], selected.match(/--jb-color:([^;]+)/)?.[1]);
  assert.match(selected, /aria-pressed="true"/);
  assert.match(selected, />Explore<\/span>/);
  const group = render(library.JellySelectionGroup, { value: 'calm', options });
  assert.equal((group.match(/data-gel-state="selected"/g) || []).length, 1);
  assert.match(group, /data-gel-state="disabled"/);
});

test('native string-valued ARIA false remains visually unselected', () => {
  for (const attribute of ['aria-pressed', 'aria-expanded']) {
    const idle = render(library.JellyButton, { [attribute]: 'false' }, 'Open');
    const selected = render(library.JellyButton, { [attribute]: 'true' }, 'Open');
    assert.match(idle, /data-gel-state="rest"/);
    assert.match(selected, /data-gel-state="selected"/);
  }
});

test('manual palette selection exposes a toolbar of pressable native buttons with one tab stop', () => {
 const html = render(library.JellySelectionGroup, {activation:'manual',value:'calm',options,'aria-label':'Palettes'});
 assert.match(html,/role="toolbar"/);
 assert.doesNotMatch(html,/role="radio"|aria-checked|activation=/);
 assert.equal((html.match(/aria-pressed="true"/g)||[]).length,1);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
});


test('compact sliders retain a named native range before the separate value scrub target', () => {
 const markup=render(library.JellySlider,{compact:true,label:'Thickness',value:100,min:65,max:150,formatValue:v=>`${v}%`});
 assert.match(markup,/jb-slider-compact/);
 assert.match(markup,/type="range"/);
 assert.match(markup,/Thickness/);
 assert.match(markup,/100%/);
 assert.ok(markup.indexOf('type="range"')<markup.indexOf('class="jb-range-value"'), 'keyboard order follows the visual label-rail-value row');
 assert.doesNotMatch(markup,/compact="/);
});

test('animated track travel is an opt-in behavior and does not leak onto the native field', () => {
 const markup=render(library.JellySlider,{animateTrack:true,label:'Surface light',name:'light',value:25,min:0,max:100});
 assert.match(markup,/type="range"/);
 assert.match(markup,/name="light"/);
 assert.match(markup,/value="25"/);
 assert.match(markup,/>25<\/span>/);
 assert.doesNotMatch(markup,/animateTrack|animatetrack/);
});
