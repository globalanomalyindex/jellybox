import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JellyWindow, JellyLink } from '../dist/index.js';
import { windowPresentation } from '../src/renderer/window-motion.js';
import { createSelectionMotion, retargetSelection, stepSelection } from '../src/renderer/selection-motion.js';

const box = {x:0,y:0,width:500,height:350,cornerRadius:30};
test('window relinquishes density and light depth together, retaining a shallow film', () => {
  const state = createSelectionMotion(box, 'explore');
  const emerged = windowPresentation(state);
  retargetSelection(state, box, 'material');
  while (state.currentKey === 'explore') stepSelection(state, 1/120);
  const submerged = windowPresentation(state);
  assert.equal(submerged.contentOpacity, 0);
  assert.ok(submerged.rimScale > 0 && submerged.rimScale < emerged.rimScale);
  assert.ok(submerged.gapScale < emerged.gapScale);
  assert.ok(submerged.attenuationScale > emerged.attenuationScale);
  assert.equal(submerged.density, 0);
  for(let i=0;i<120;i++)stepSelection(state,1/120);
  assert.deepEqual(windowPresentation(state), emerged);
});
test('window mapping stays bounded with interrupted spring overshoot and reduced motion', () => {
  const state = createSelectionMotion(box, 'one');
  for(let i=0;i<200;i++){
    if(i%11===0)retargetSelection(state,box,String(i));
    stepSelection(state,1/120);
    const frame=windowPresentation(state);
    assert.ok(frame.contentOpacity>=0&&frame.contentOpacity<=1);
    assert.ok(frame.density>=0&&frame.density<=1);
    assert.ok(frame.rimScale>=.16&&frame.rimScale<=1.06);
  }
  stepSelection(state, 1/60, true);
  assert.equal(windowPresentation(state).contentOpacity,1);
});
test('window renders its initial view on the server without importing Three', () => {
  const html=renderToStaticMarkup(h(JellyWindow,{viewKey:'one',tone:'info','aria-label':'Workspace'}, key=>h('p',null,key)));
  assert.match(html,/data-gel-window="idle"/);
  assert.match(html,/<p>one<\/p>/);
  assert.doesNotMatch(html,/aria-hidden="true"/);
});
test('library links retain native navigation and downloads with the shared button anatomy', () => {
  const html=renderToStaticMarkup(h(JellyLink,{href:'/guide.md',download:true,tone:'info'},'Guide'));
  assert.match(html,/<a[^>]*href="\/guide.md"/);
  assert.match(html,/download=""/);
  assert.match(html,/jb-button-face/);
  assert.doesNotMatch(html,/<button/);
});
