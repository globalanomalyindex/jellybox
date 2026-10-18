import * as THREE from 'three';

// Reading is the front of the same transmitting material. Its support follows
// the volume's actual crown/shoulders, never a shape around the lettering.
// This never repaints the lit framebuffer or introduces another surface.
export function installReadingFilm(material) {
  const reading = { surface: { value: new THREE.Vector3(1, 1, .5) }, enabled: { value: 0 }, ink: { value: 0 } };
  material.userData.reading = reading;
  const compile = material.onBeforeCompile, cacheKey = material.customProgramCacheKey;
  material.onBeforeCompile = shader => {
    compile.call(material, shader);
    Object.assign(shader.uniforms, { uReadingSurface: reading.surface, uReadingEnabled: reading.enabled, uReadingInk: reading.ink });
    shader.fragmentShader = `uniform vec3 uReadingSurface; uniform float uReadingEnabled; uniform float uReadingInk;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 readingQ = abs(vJellyPosition) - max(vec2(0.0), uReadingSurface.xy * .5 - uReadingSurface.z);
      float readingDistance = length(max(readingQ, vec2(0.0))) + min(max(readingQ.x, readingQ.y), 0.0) - uReadingSurface.z;
      float readingCrown = max(8.0, min(uReadingSurface.x, uReadingSurface.y) * .24);
      float readingFilm = uReadingEnabled * smoothstep(3.0, readingCrown, -readingDistance);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <clearcoat_normal_fragment_begin>', `
      float readingFacing = smoothstep(.25, .85, dot(normal, normalize(vPocketZ)));
      float readingSupport = readingFilm * readingFacing;
      normal = normalize(mix(normal, normalize(vPocketZ), readingSupport * .45));
      nonPerturbedNormal = normal;
      #include <clearcoat_normal_fragment_begin>
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `
      #include <lights_physical_fragment>
      material.roughness = min(1.0, material.roughness + readingSupport * .06);
      material.specularColor *= 1.0 - readingSupport * .25;
      material.specularColorBlended *= 1.0 - readingSupport * .25;
      #ifdef USE_CLEARCOAT
        material.clearcoat *= 1.0 - readingSupport * .45;
      #endif
    `);
    shader.fragmentShader = shader.fragmentShader.replace('vec3 pos = vWorldPosition;', `
      float transmittingReadPlane = readingSupport * (1.0 - uReadingInk);
      // A finite absorption tint preserves even the darkest custom pigment's
      // transmitting film. The long optical paths in the shoulders stay dense.
      material.attenuationColor = mix(material.attenuationColor, max(material.attenuationColor, vec3(.008)), transmittingReadPlane);
      material.attenuationDistance = mix(material.attenuationDistance, max(material.attenuationDistance, material.thickness / .35), transmittingReadPlane);
      vec3 pos = vWorldPosition;
    `);
  };
  material.customProgramCacheKey = () => `${cacheKey.call(material)}-reading-film-v2`;
}

export function updateReadingFilm(material, target, body, retain = false) {
  const reading = material.userData.reading;
  reading.surface.value.set(body.width, body.height, body.r);
  // A retiring window keeps its displayed reading material until the same
  // owner's body has withdrawn. Losing a native tab is not a second exit cue.
  if (!target && retain) return;
  reading.ink.value = target?.ink === '#ffffff' ? 1 : 0;
  reading.enabled.value = target && target.width > 0 && target.height > 0 ? 1 : 0;
}
