import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createContrastSampler } from '../src/renderer/contrast-sampler.js';

// Exercise the real asynchronous atlas adapter at its renderer boundary. The
// two rows deliberately have opposite intended inks over the same dark light.
function rendererFixture() {
  let target = null, release, reject;
  const draws = [], viewportCalls = [], reads = [];
  const renderer = {
    autoClear: true, info: { autoReset: true },
    getDrawingBufferSize: value => value.set(1600, 1200),
    copyFramebufferToTexture() {}, getRenderTarget: () => target,
    getScissorTest: () => false,
    getViewport: value => value.set(0, 0, 800, 600),
    getScissor: value => value.set(0, 0, 800, 600),
    setRenderTarget: value => { target = value; },
    setScissorTest() {}, setScissor() {},
    setViewport: value => viewportCalls.push(value.clone()),
    render: () => { draws.push({ viewport: target.viewport.clone(), width: target.width, height: target.height }); },
    readRenderTargetPixelsAsync(_target, x, y, width, height, buffer) {
      reads.push({ x, y, width, height });
      for (let pixel = 0; pixel < buffer.length; pixel += 4) buffer.set([0, 0, 0, 255], pixel);
      return new Promise((resolve, fail) => { release = resolve; reject = fail; });
    },
  };
  return { renderer, draws, reads, viewportCalls,
    resolve: async () => { release(); await new Promise(resolve => setImmediate(resolve)); },
    reject: async () => { reject(new Error('readback unavailable')); await new Promise(resolve => setImmediate(resolve)); },
  };
}

test('optical sampling verifies each native ink intent without relabeling it from lighting', async () => {
  const fixture = rendererFixture(), batches = [];
  const sampler = createContrastSampler(fixture.renderer, rows => batches.push(rows));
  const targets = [
    { id: 'transmitting', x: 20, y: 20, width: 70, height: 8, ink: '#000000' },
    { id: 'deliberate-dark', x: 20, y: 80, width: 70, height: 8, ink: '#ffffff' },
  ];
  const scene = { width: 800, height: 600, contrastTargets: targets };
  sampler.sample(scene, 100);
  sampler.sample(scene, 200);
  assert.equal(fixture.reads.length, 1, 'only one GPU readback may be pending');
  await fixture.resolve();
  assert.deepEqual(batches[0].map(({ id, ink, ratio }) => ({ id, ink, ratio })), [
    { id: 'transmitting', ink: '#000000', ratio: 1 },
    { id: 'deliberate-dark', ink: '#ffffff', ratio: 21 },
  ], 'a failed reading remains honestly reported rather than changing native text on glare');
  assert.deepEqual(fixture.draws[0], { viewport: new THREE.Vector4(0, 0, 9, 2), width: 9, height: 40 });
  assert.deepEqual(fixture.viewportCalls, [new THREE.Vector4(0, 0, 800, 600)], 'only the saved default viewport is restored through the DPR-scaled API');
  sampler.destroy();
});

test('an optical callback completed after disposal cannot recolor a detached label', async () => {
  const fixture = rendererFixture(), batches = [];
  const sampler = createContrastSampler(fixture.renderer, rows => batches.push(rows));
  sampler.sample({ width: 800, height: 600, contrastTargets: [{ id: 'removed', x: 20, y: 20, width: 70, height: 8 }] }, 100);
  sampler.destroy();
  await fixture.resolve();
  assert.deepEqual(batches, []);
});

test('an unavailable readback preserves the intended ink and reports no contrast evidence', async () => {
  const fixture = rendererFixture(), batches = [];
  const sampler = createContrastSampler(fixture.renderer, rows => batches.push(rows));
  sampler.sample({ width: 800, height: 600, contrastTargets: [{ id: 'dark', x: 20, y: 20, width: 70, height: 8, ink: '#ffffff' }] }, 100);
  await fixture.reject();
  assert.deepEqual(batches, [[{ id: 'dark', ink: '#ffffff', ratio: 0, halo: false }]]);
  sampler.destroy();
});
