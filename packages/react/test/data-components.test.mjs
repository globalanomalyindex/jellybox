import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JellyDialog, JellyTable } from '../dist/index.js';
import { dialogTabStops, restoreDialogFocus, wrapDialogTab } from '../src/dialog-focus.js';

const render = (Component, props) => renderToStaticMarkup(h(Component, props));
const columns = [{ key: 'name', header: 'Name', sortable: true }, { key: 'count', header: 'Count', sortable: true, align: 'right' }];
const rows = [{ id: 'one', name: 'First', count: 2 }, { id: 'two', name: 'Second', count: 1 }];

test('dialog keeps stable named native markup and defers modal activation to the browser', () => {
  const html = render(JellyDialog, { open: true, onOpenChange() {}, title: 'Project settings', description: 'Choose your preferences.', children: h('input', { name: 'project', defaultValue: 'JellyBox' }), footer: h('button', {}, 'Save') });
  assert.match(html, /^<dialog /);
  assert.doesNotMatch(html, /<dialog[^>]*\sopen(?:=|\s|>)/);
  const titleId = html.match(/aria-labelledby="([^"]+)"/)?.[1];
  const descriptionId = html.match(/aria-describedby="([^"]+)"/)?.[1];
  assert.ok(titleId && html.includes(`id="${titleId}">Project settings`));
  assert.ok(descriptionId && html.includes(`id="${descriptionId}">Choose your preferences.`));
  assert.match(html, /type="button"[^>]*aria-label="Close dialog"/);
  assert.match(html, /name="project"/);
  assert.match(html, /<footer[^>]*><button>Save/);
});

test('dialog surface composition wraps header, body, and footer once', () => {
  const html = render(JellyDialog, { open: false, onOpenChange() {}, title: 'Compose', children: 'Body', footer: 'Footer', renderSurface: content => h('section', { 'data-test-surface': true }, content) });
  assert.match(html, /jb-dialog-optical/);
  assert.equal((html.match(/data-test-surface=/g) || []).length, 1);
  assert.match(html, /<section[^>]*><div class="jb-dialog-frame" inert=""><header/);
  assert.match(html, /<footer[^>]*>Footer<\/footer><\/div><\/section>/);
});

test('dialog leaves content interactive only while open, with a stable exit frame', () => {
  const props = { onOpenChange() {}, title: 'Save changes', children: h('button', { type: 'submit' }, 'Save') };
  assert.doesNotMatch(render(JellyDialog, { ...props, open: true }), /class="jb-dialog-frame" inert/);
  assert.match(render(JellyDialog, { ...props, open: false }), /class="jb-dialog-frame" inert=""/);
});

test('dialog Tab wraps boundaries while respecting native tab stops and child key handling', () => {
  const document = { activeElement: null, defaultView: { getComputedStyle: node => ({ visibility: node.visibility || 'visible' }) } };
  const control = (name, extra = {}) => ({ name, tabIndex: 0, form: null, ...extra,
    matches(selector) { return selector === 'input[type="radio"]' ? this.radio : Boolean(this.disabled || this.hiddenType); },
    closest() { return this.inert || this.hidden; }, getClientRects() { return this.collapsed ? [] : [{}]; },
    focus() { document.activeElement = this; },
  });
  const first = control('Close'), field = control('Name'), unchecked = control('choice', { radio: true });
  const checked = control('choice', { radio: true, checked: true });
  const hidden = control('Hidden', { hidden: true }), disabled = control('Disabled', { disabled: true });
  const last = control('Save');
  const nodes = [first, field, unchecked, checked, hidden, disabled, last];
  const dialog = { ownerDocument: document, querySelectorAll: () => nodes, contains: node => nodes.includes(node), focus() { document.activeElement = this; } };
  assert.deepEqual(dialogTabStops(dialog), [first, field, checked, last]);
  const tab = shiftKey => ({ key: 'Tab', shiftKey, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } });
  document.activeElement = last;
  assert.equal(wrapDialogTab(tab(false), dialog), true);
  assert.equal(document.activeElement, first);
  assert.equal(wrapDialogTab(tab(true), dialog), true);
  assert.equal(document.activeElement, last);
  document.activeElement = field;
  assert.equal(wrapDialogTab(tab(false), dialog), false, 'middle controls use native navigation');
  const handled = tab(false); handled.preventDefault(); document.activeElement = last;
  assert.equal(wrapDialogTab(handled, dialog), false, 'nested widgets can handle their own Tab first');
  first.tabIndex = 2; last.tabIndex = 1;
  assert.deepEqual(dialogTabStops(dialog), [last, first, field, checked]);
  nodes.forEach(node => { node.inert = true; });
  assert.equal(wrapDialogTab(tab(false), dialog), true);
  assert.equal(document.activeElement, dialog, 'an exiting inert frame keeps focus on the native modal');
});

test('rapid dialog reopening restores the last valid control after inert dropped focus', () => {
  const body = {};
  const document = { activeElement: body, defaultView: { getComputedStyle: node => ({ visibility: node.visibility || 'visible' }) } };
  const control = (name, tabIndex = 0) => ({ name, tabIndex, value: 'Preserved text',
    matches(selector) { return selector === 'input[type="radio"]' ? false : Boolean(this.disabled); },
    closest() { return this.inert; }, getClientRects() { return this.hidden ? [] : [{}]; },
    focus() { document.activeElement = this; },
  });
  const close = control('Close'), initial = control('Name'), reopen = control('Reopen');
  const nodes = [close, initial, reopen];
  const dialog = { ownerDocument: document, querySelectorAll: () => nodes, contains: node => nodes.includes(node), focus() { document.activeElement = this; } };
  reopen.focus();
  nodes.forEach(node => { node.inert = true; }); document.activeElement = body;
  nodes.forEach(node => { node.inert = false; });
  assert.equal(restoreDialogFocus(dialog, [reopen, initial]), reopen);
  assert.equal(document.activeElement, reopen);
  assert.equal(initial.value, 'Preserved text');
  initial.focus();
  assert.equal(restoreDialogFocus(dialog, [reopen]), initial, 'existing valid focus is not stolen');
  document.activeElement = body; reopen.disabled = true;
  assert.equal(restoreDialogFocus(dialog, [reopen, initial]), initial, 'disabled prior control falls back to requested initial focus');
  document.activeElement = body; initial.hidden = true;
  assert.equal(restoreDialogFocus(dialog, [control('Removed'), initial]), close, 'removed or hidden references fall back to the first available stop');
});

test('table preserves native caption, scoped headers, controlled sort, and row rendering', () => {
  const html = render(JellyTable, { caption: 'Projects', columns, rows, sort: { key: 'count', direction: 'desc' } });
  assert.match(html, /<table[^>]*class="jb-table"/);
  assert.match(html, /<caption[^>]*>Projects<\/caption>/);
  assert.equal((html.match(/scope="col"/g) || []).length, 2);
  assert.match(html, /aria-sort="descending"/);
  assert.equal((html.match(/aria-sort=/g) || []).length, 1);
  assert.ok(html.indexOf('First') < html.indexOf('Second'), 'controlled sorting preserves caller row order');
  assert.match(html, /text-align:right/);
});

test('table selection has a mixed select-all state and disables unavailable rows', () => {
  const html = render(JellyTable, { caption: 'Projects', columns, rows: [...rows, { id: 'three', name: 'Locked', count: 3 }], selectedKeys: ['one'], onSelectionChange() {}, isRowDisabled: row => row.id === 'three' });
  assert.match(html, /aria-label="Select all rows on this page"[^>]*aria-checked="mixed"/);
  assert.match(html, /aria-label="Select First"[^>]*checked=""/);
  assert.match(html, /aria-label="Select Locked"[^>]*disabled=""/);
  assert.match(html, /data-selected="true"/);
  assert.match(html, /jb-checkbox-mixed/);
  assert.match(html, /jb-checkbox-copy/);
  assert.match(html, /data-gel-surface="table"/);
  assert.match(html, /data-gel-surface="row"/);
});

test('table loading and empty states retain the column structure and separate announcements', () => {
  const empty = render(JellyTable, { caption: 'Projects', columns, rows: [], emptyMessage: 'No matching projects.' });
  assert.match(empty, /colSpan="2"[^>]*>No matching projects\.<\/td>/);
  const loading = render(JellyTable, { caption: 'Projects', columns, rows, loading: true });
  assert.match(loading, /role="status">Loading rows<\/div>/);
  assert.match(loading, /<table[^>]*aria-busy="true"/);
  assert.match(loading, /aria-hidden="true" class="jb-table-loading-lines"/);
  assert.doesNotMatch(loading, />First</);
});

test('table custom renderers preserve child semantics without replacing their tone', () => {
  const html = render(JellyTable, { caption: 'Tasks', tone: 'info', rows: [{ id: 1, status: 'Failed' }], columns: [{ key: 'status', header: 'Status', render: (value, row) => h('span', { 'data-status-id': row.id, style: { color: '#771111' } }, value) }] });
  assert.match(html, /data-status-id="1" style="color:#771111">Failed<\/span>/);
});

test('selectable tables reject missing or duplicate row identities', () => {
  assert.throws(() => render(JellyTable, { caption: 'Projects', columns, rows: [{ name: 'Missing' }], selectedKeys: [] }), /unique row.id/);
  assert.throws(() => render(JellyTable, { caption: 'Projects', columns, rows: [rows[0], rows[0]], selectedKeys: [] }), /unique row.id/);
});
