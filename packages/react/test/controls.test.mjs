import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JellyTabs, JellyDropdown, JellyCheckbox } from '../dist/index.js';

const render = (Component, props) => renderToStaticMarkup(h(Component, props));

test('tabs associate every mounted panel and skip a disabled default tab stop', () => {
  const html = render(JellyTabs, {
    id: 'settings', 'aria-label': 'Settings', items: [
      { value: 'unavailable', label: 'Unavailable', content: 'Disabled', disabled: true },
      { value: 'profile', label: 'Profile', content: h('input', { name: 'profile', defaultValue: 'Chris' }) },
      { value: 'billing', label: 'Billing', content: h('input', { name: 'billing', defaultValue: 'Saved form' }) },
    ],
  });
  assert.match(html, /role="tablist" aria-label="Settings"/);
  assert.match(html, /aria-orientation="horizontal"/);
  assert.equal((html.match(/role="tabpanel"/g) || []).length, 3);
  assert.equal((html.match(/aria-selected="true"/g) || []).length, 1);
  assert.equal((html.match(/tabindex="0"[^>]*disabled/g) || []).length, 0);
  assert.match(html, /id="settings-tab-1"[^>]*aria-selected="true"[^>]*aria-controls="settings-panel-1"[^>]*tabindex="0"/);
  assert.match(html, /id="settings-panel-2"[^>]*aria-labelledby="settings-tab-2"[^>]*hidden=""/);
  assert.match(html, /name="billing" value="Saved form"/);
  assert.match(html, /data-gel-group="settings-list"/);
});

test('controlled numeric tab value wins over default and vertical orientation remains explicit', () => {
  const html = render(JellyTabs, { value: 0, defaultValue: 1, orientation: 'vertical', 'aria-label': 'Views', items: [{ value: 0, label: 'Zero', content: 'First' }, { value: 1, label: 'One', content: 'Second' }] });
  assert.match(html, /aria-orientation="vertical"/);
  assert.match(html, /aria-selected="true"[^>]*data-gel-key="number:0"/);
});

test('dropdown renders a designed in-place list plus native required submission control', () => {
  const html = render(JellyDropdown, {
    id: 'color', name: 'color', form: 'preferences', label: 'Color', required: true, description: 'Pick one color',
    options: [{ value: 'blue', label: 'Water blue', description: 'Quiet' }, { value: 'lime', label: 'Lime', disabled: true }],
  });
  assert.match(html, /id="color"[^>]*role="combobox"[^>]*aria-haspopup="listbox"[^>]*aria-expanded="false"/);
  assert.match(html, /aria-labelledby="color-label color-value"/);
  assert.match(html, /aria-describedby="color-description"/);
  assert.match(html, /id="color-list" role="listbox"[^>]*hidden=""/);
  assert.match(html, /<select[^>]*name="color"[^>]*form="preferences"[^>]*required=""[^>]*tabindex="-1"[^>]*aria-hidden="true"/);
  assert.match(html, /role="option" aria-selected="false" aria-disabled="true"/);
  assert.match(html, /<option value="" selected="">Choose an option<\/option>/);
});

test('dropdown preserves typed numeric default through its string form value and associates errors', () => {
  const html = render(JellyDropdown, { id: 'level', label: 'Level', name: 'level', defaultValue: 0, error: 'Choose another level', options: [{ value: 0, label: 'Zero' }, { value: 1, label: 'One' }] });
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="level-error"/);
  assert.match(html, /id="level-value"[^>]*>Zero<\/span>/);
  assert.match(html, /<option value="0" selected="">Zero<\/option>/);
});

test('checkbox remains native and exposes mixed state, form identity, and error/help association', () => {
  const html = render(JellyCheckbox, { id: 'agree', name: 'agreement', value: 'yes', label: 'Accept', defaultChecked: true, indeterminate: true, required: true, description: 'Review the terms', error: 'Confirm this choice', 'aria-describedby': 'extra' });
  assert.match(html, /type="checkbox"/);
  assert.match(html, /name="agreement"/);
  assert.match(html, /value="yes"/);
  assert.match(html, /required=""/);
  assert.match(html, /checked=""/);
  assert.match(html, /aria-checked="mixed"/);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="extra agree-description agree-error"/);
  assert.match(html, /aria-labelledby="agree-label"/);
  assert.match(html, /for="agree"/);
});

test('checkbox can omit the optical lens marker while retaining native accessible selection', () => {
  const html = render(JellyCheckbox, { optical: false, checked: true, onCheckedChange() {}, 'aria-label': 'Select row', name: 'row', label: '' });
  assert.doesNotMatch(html, /data-gel-surface/);
  assert.doesNotMatch(html, / optical=/);
  assert.match(html, /aria-label="Select row"/);
  assert.doesNotMatch(html, /aria-labelledby=/);
  assert.match(html, /checked=""/);
});
