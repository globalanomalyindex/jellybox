import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as jelly from '../dist/index.js';

test('a material provider supplies its pigment to ordinary controls without replacing semantic outcomes', () => {
  const render = child => renderToStaticMarkup(h(jelly.JellyMaterialProvider, {pigment:'#ffb251'}, child));
  for (const control of [h(jelly.JellySlider,{label:'Thickness',value:100}), h(jelly.JellyButton,{selected:true},'Apply'),
    h(jelly.JellyDropdown,{label:'Shape',options:[{value:'round',label:'Round'}],defaultValue:'round'})]) {
    assert.match(render(control), /--jb-color:#ffb251/, 'each ordinary control uses its owner pigment');
  }
  for (const [tone, color] of [['success','#62cf9c'],['danger','#f18787'],['warning','#f6bd65']]) {
    assert.match(render(h(jelly.JellyButton,{tone,selected:true},tone)), new RegExp(`--jb-color:${color}`), `${tone} keeps its semantic pigment`);
  }
  assert.match(render(h(jelly.JellyButton,{pigment:'#bc69d7',selected:true},'Custom')), /--jb-color:#bc69d7/, 'an explicit pigment wins');
  assert.match(render(h(jelly.JellyMaterialProvider,null,h(jelly.JellyButton,{selected:true},'Default'))), /--jb-color:#5baff3/, 'a nested empty provider restores the normal palette');
});
