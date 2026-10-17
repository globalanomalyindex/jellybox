import * as THREE from 'three';
import { chooseJellyInk } from '../contrast.js';

// One asynchronous 9-pixel row per label. No DOM rasterization, second scene
// renderer, full-frame CPU readback, or per-control synchronous GPU stalls.
export function createContrastSampler(renderer, publish) {
  const scene = new THREE.Scene(), camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const rects = Array.from({ length: 40 }, () => new THREE.Vector4());
  const uniforms = { source: { value: null }, rects: { value: rects }, count: { value: 1 } };
  const material = new THREE.ShaderMaterial({ uniforms, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }',
    fragmentShader: `varying vec2 vUv; uniform sampler2D source; uniform vec4 rects[40]; uniform float count;
      void main(){ int row=int(floor(vUv.y*count)); vec4 r=rects[row]; float tap=floor(vUv.x*9.0);
        vec2 p=vec2(mod(tap,3.0),floor(tap/3.0))*.42+.08;
        vec2 uv=r.xy+r.zw*p; gl_FragColor=vec4(texture2D(source,vec2(uv.x,1.0-uv.y)).rgb,1.0); }` });
  const geometry = new THREE.PlaneGeometry(2, 2); scene.add(new THREE.Mesh(geometry, material));
  const target = new THREE.WebGLRenderTarget(9, 40, { depthBuffer: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const size = new THREE.Vector2(), viewport = new THREE.Vector4(), scissor = new THREE.Vector4();
  const history = new Map();
  let texture, pending = false, last = -Infinity, disposed = false;
  return {
    sample(state, timestamp) {
      if (!publish || pending || timestamp - last < 100) return;
      const items = (state.contrastTargets || []).filter(item => item.width > 0 && item.height > 0 && item.y >= (state.viewportTop ?? 0) && item.y + item.height <= (state.viewportTop ?? 0) + (state.viewportHeight ?? state.height)).slice(0, 40);
      if (!items.length) return;
      last = timestamp;
      renderer.getDrawingBufferSize(size);
      if (!texture || texture.image.width !== size.x || texture.image.height !== size.y) {
        texture?.dispose(); texture = new THREE.FramebufferTexture(size.x, size.y); uniforms.source.value = texture;
      }
      renderer.copyFramebufferToTexture(texture);
      items.forEach((r, i) => rects[i].set(r.x / state.width, r.y / state.height, r.width / state.width, r.height / state.height));
      uniforms.count.value = items.length;
      target.setSize(9, items.length);
      const previousTarget = renderer.getRenderTarget(), autoClear = renderer.autoClear, scissorTest = renderer.getScissorTest(), autoReset = renderer.info.autoReset;
      renderer.getViewport(viewport); renderer.getScissor(scissor);
      try {
        renderer.info.autoReset = false; renderer.setRenderTarget(target); renderer.setScissorTest(false); renderer.autoClear = true;
        renderer.render(scene, camera);
        const buffer = new Uint8Array(items.length * 9 * 4);
        pending = true;
        renderer.readRenderTargetPixelsAsync(target, 0, 0, 9, items.length, buffer).then(() => {
          if (disposed) return;
          const ids = new Set(items.map(item => item.id));
          for (const id of history.keys()) if (!ids.has(id)) history.delete(id);
          publish(items.map((item, index) => {
            const samples = Array.from({ length: 9 }, (_, tap) => {
              const at = (index * 9 + tap) * 4;
              return '#' + [...buffer.slice(at, at + 3)].map(c => c.toString(16).padStart(2, '0')).join('');
            });
            const result = chooseJellyInk(samples, history.get(item.id));
            history.set(item.id, result.ink);
            return { id: item.id, ...result };
          }));
        }).catch(() => {
          if (!disposed) publish(items.map(item => ({ id: item.id, ink: history.get(item.id) || '#03121e', ratio: 0, halo: false })));
        }).finally(() => { pending = false; });
      } finally {
        renderer.setRenderTarget(previousTarget); renderer.autoClear = autoClear; renderer.info.autoReset = autoReset;
        renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
      }
    },
    destroy() { disposed = true; texture?.dispose(); geometry.dispose(); material.dispose(); target.dispose(); history.clear(); },
  };
}
