import * as THREE from 'three';
import { lightTemperature } from './lighting.js';

// A bounded postpass over the *existing* scene. Framebuffer values are already
// display encoded; copy/sample/write without a second tone/color conversion.
export function createScrollEdge(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    source: { value: null }, size: { value: new THREE.Vector2(1, 1) },
    bandRatio: { value: 1 }, radius: { value: 1 }, strength: { value: 0 },
    direction: { value: new THREE.Vector2() }, lightColor: { value: new THREE.Vector3(1, 1, 1) }, lightPower: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.NoBlending,
    vertexShader: `varying vec2 vUv;
      void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: `varying vec2 vUv;
      uniform sampler2D source; uniform vec2 size; uniform float bandRatio;
      uniform float radius; uniform float strength; uniform vec2 direction;
      uniform vec3 lightColor; uniform float lightPower;
      void main() {
        float t = 1.0 - vUv.y;
        float density = t * t * (3.0 - 2.0 * t);
        vec2 uv = vec2(vUv.x, vUv.y * bandRatio);
        vec3 original = texture2D(source, uv).rgb;
        vec2 refracted = uv + direction * density * strength / size;
        vec2 spread = vec2(radius * density) / size;
        vec3 blurred = texture2D(source, refracted).rgb * .2;
        for (int ring = 1; ring <= 2; ring++) {
          for (int tap = 0; tap < 6; tap++) {
            float angle = float(tap) * 1.04719755 + float(ring) * .37;
            vec2 offset = vec2(cos(angle), sin(angle)) * spread * float(ring) * .5;
            blurred += texture2D(source, refracted + offset).rgb / 15.0;
          }
        }
        // A shallow, clear-water concentration. Light catches a broad crown;
        // no opaque white footer, hard lip or independent attention animation.
        float crown = exp(-pow((t - .62) / .24, 2.0));
        blurred *= vec3(1.0) - vec3(.035, .018, .008) * density;
        blurred += lightColor * crown * .012 * lightPower;
        gl_FragColor = vec4(mix(original, blurred, strength * density), 1.0);
      }`,
  });
  const geometry = new THREE.PlaneGeometry(2, 2);
  scene.add(new THREE.Mesh(geometry, material));
  const buffer = new THREE.Vector2(), origin = new THREE.Vector2();
  const viewport = new THREE.Vector4(), scissor = new THREE.Vector4();
  let texture;

  return {
    render(state) {
      const edge = state.scrollEdge;
      if (!edge || edge.strength < .001 || edge.height < 1) return false;
      const ratio = renderer.getPixelRatio();
      renderer.getDrawingBufferSize(buffer);
      const bottom = Math.max(0, Math.round((state.height - (state.viewportTop ?? 0) - (state.viewportHeight ?? state.height)) * ratio));
      const band = Math.min(Math.ceil(edge.height * ratio), buffer.y - bottom);
      const sampleHeight = Math.min(band + Math.ceil(24 * ratio), buffer.y - bottom);
      if (band < 1 || sampleHeight < 1) return false;
      if (!texture || texture.image.width !== buffer.x || texture.image.height !== sampleHeight) {
        texture?.dispose();
        texture = new THREE.FramebufferTexture(buffer.x, sampleHeight);
        texture.minFilter = texture.magFilter = THREE.LinearFilter;
        uniforms.source.value = texture;
      }
      renderer.copyFramebufferToTexture(texture, origin.set(0, bottom));
      uniforms.size.value.set(buffer.x, sampleHeight);
      uniforms.bandRatio.value = band / sampleHeight;
      uniforms.radius.value = 12 * ratio;
      uniforms.strength.value = edge.strength;
      const light = state.light;
      const power = light?.enabled === false ? 0 : Math.max(0, Math.min(1, light?.intensity ?? 0));
      uniforms.direction.value.set(((light?.x ?? state.width / 2) / state.width - .5) * ratio * power, .4 * ratio * power);
      uniforms.lightColor.value.fromArray(lightTemperature(light?.warmth ?? .5));
      uniforms.lightPower.value = power;
      renderer.getViewport(viewport); renderer.getScissor(scissor);
      const autoClear = renderer.autoClear, scissorTest = renderer.getScissorTest(), autoReset = renderer.info.autoReset;
      try {
        renderer.autoClear = false;
        renderer.info.autoReset = false;
        renderer.setViewport(0, bottom / ratio, state.width, band / ratio);
        renderer.setScissor(0, bottom / ratio, state.width, band / ratio);
        renderer.setScissorTest(true);
        renderer.render(scene, camera);
      } finally {
        renderer.autoClear = autoClear;
        renderer.info.autoReset = autoReset;
        renderer.setViewport(viewport); renderer.setScissor(scissor); renderer.setScissorTest(scissorTest);
      }
      return true;
    },
    destroy() { texture?.dispose(); geometry.dispose(); material.dispose(); },
  };
}
