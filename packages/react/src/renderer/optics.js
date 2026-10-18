import { OPTICAL_SURFACE_LIMIT, SURFACE_ROLES, assignSurfaceSlots } from './surface-layout.js';
import { windowPresentation } from './window-motion.js';
import { tabWarpY, tabUnwarpY, tabDensity, tabMaximumLift, TAB_GLSL, TAB_DEPTH_RATIO } from './tab-surface.js';
import * as THREE from 'three';
import { MOTION, sampleBezier, stepJellyResponse, stepAttraction } from './motion.js';
import { surfacePigment, windowPigment } from './surface-color.js';
import { lightTemperature, moveReceiverField } from './lighting.js';
import { DEFAULT_MATERIAL, JELLY_MATERIAL } from './material.js';
import { DENSITY_GLSL, densityFieldProfile, densityClearing, densityPresentation, densityAttenuation, densityColorWeight, stepDensitySettle, densityHoverResponse } from './density-field.js';
import { createContrastSampler } from './contrast-sampler.js';
import { installReadingFilm, updateReadingFilm } from './reading-film.js';
import { ACTIVITY_VOLUME, activityPocket, activityDisplacement, activityContour, stepActivity, activityPigment, ACTIVITY_GLSL, ACTIVITY_PIGMENT_GLSL } from './activity.js';
import { volumeCrown, volumeHeight, volumeFullness } from './volume-profile.js';
import { primaryTabMerge } from './tab-transfer.js';
import { POCKET, POCKET_GLSL, stepPocket, pocketShape } from './pocket.js';
import { createJellyPalette } from '../color.js';
import { createSelectionMotion, retargetSelection, stepSelection, selectionRect, selectionContour } from './selection-motion.js';
import { createScrollEdge } from './scroll-edge.js';

// Closed geometry and PBR volume rendering. The separate photon pass is a
// bounded approximation of refracted direct light, not a path-traced renderer.
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, value) => { const t = clamp((value - a) / (b - a)); return t * t * (3 - 2 * t); };
// Ignore numerical residue far below a display pixel. Without this, an
// asymptotically settled layout invalidates cached optical profiles forever.
const geometrySampleKey = values => values.map(value => typeof value === 'number' ? Math.round(value * 1000) : value).join(',');
const PHOTON_RANGE = 7;
const LIGHT_DIRECTION = new THREE.Vector3(780, -900, -760).normalize();
// One cached pigment path wakes the whole parent concentration. Linear working
// colors are decoded once; the same eased hover gain samples color and strain.
const DENSITY_HOVER_PIGMENT = createJellyPalette('#bfdfee', '#69bafa').colors.map(hex => new THREE.Color(hex).toArray());

function colorFrom(rgb) {
  return new THREE.Color().setRGB(...rgb, THREE.SRGBColorSpace);
}

function seededNoiseTexture(size = 256) {
  const color = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  let seed = 724531;
  const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < size * size; i++) {
    const fine = random();
    const fiber = random() > 0.975 ? -10 : 0;
    const tone = Math.round(247 + (fine - 0.5) * 13 + fiber);
    const height = Math.round(128 + (fine - 0.5) * 112 + fiber * 2);
    color.set([tone, tone, Math.min(255, tone + 1), 255], i * 4);
    relief.set([height, height, height, 255], i * 4);
  }
  const make = (data, space) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.colorSpace = space;
    texture.needsUpdate = true;
    return texture;
  };
  return { color: make(color, THREE.SRGBColorSpace), relief: make(relief, THREE.NoColorSpace) };
}

function makeEnvironment(renderer) {
  const room = new THREE.Scene();
  room.background = new THREE.Color(0xbec5d0);
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1600, 1600, 1600), new THREE.MeshBasicMaterial({ color: 0xc3c8d0, side: THREE.BackSide }));
  room.add(shell);
  const panels = [];
  const panel = (width, height, position, intensity, color = 0xffffff) => {
    const material = new THREE.MeshBasicMaterial({ color, toneMapped: false, side: THREE.DoubleSide });
    material.color.multiplyScalar(intensity);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
    mesh.position.set(...position);
    mesh.lookAt(0, 0, 0);
    room.add(mesh);
    panels.push(mesh);
  };
  panel(560, 170, [-330, 390, 570], 4.5);
  panel(100, 430, [540, 60, 280], 2.4, 0xe7f4ff);
  panel(440, 330, [-120, -500, 370], 0.52);
  panel(170, 380, [-520, -90, 180], 0.14, 0x485365);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const target = pmrem.fromScene(room, 0.045, 0.1, 2500);
  pmrem.dispose();
  shell.geometry.dispose(); shell.material.dispose();
  panels.forEach(mesh => { mesh.geometry.dispose(); mesh.material.dispose(); });
  return target;
}

function makeFluxField(width = 96, height = 64) {
  const bytes = new Uint8Array(width * height * 4);
  const accumulation = new Float32Array(width * height * 3);
  const texture = new THREE.DataTexture(bytes, width, height, THREE.RGBAFormat);
  texture.colorSpace = THREE.LinearSRGBColorSpace;
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return { width, height, bytes, accumulation, texture, strength: { value: 1 }, spectralShift: new THREE.Vector2(), kernel: null,
    shadowFullness: { value: 0 }, shadowIncident: LIGHT_DIRECTION.clone(), shadowBox: new THREE.Vector2(), shadowTab: new THREE.Vector3(), shadowNeck: new THREE.Vector3(), shadowGeom: new THREE.Vector4(), shadowShape: new THREE.Vector4(), shadowTint: new THREE.Color(),
    shadowFlow: new THREE.Vector4(), shadowPointer: new THREE.Vector2(), rect: new THREE.Vector4(-1, -1, 2, 2) };
}

function installFloorFlux(material, fields) {
  const uniforms = {};
  fields.forEach((field, i) => {
    uniforms[`uFlux${i}`] = { value: field.texture };
    uniforms[`uFluxWeight${i}`] = field.strength;
    uniforms[`uFluxRect${i}`] = { value: field.rect };
    uniforms[`uSpectralShift${i}`] = { value: field.spectralShift };
    {
      uniforms[`uShadowIncident${i}`] = { value: field.shadowIncident };
      uniforms[`uShadowGeom${i}`] = { value: field.shadowGeom };
      uniforms[`uShadowShape${i}`] = { value: field.shadowShape };
      uniforms[`uShadowBox${i}`] = { value: field.shadowBox };
      uniforms[`uShadowTab${i}`] = { value: field.shadowTab };
      uniforms[`uShadowNeck${i}`] = { value: field.shadowNeck };
      uniforms[`uShadowFullness${i}`] = field.shadowFullness;
      uniforms[`uShadowTint${i}`] = { value: field.shadowTint };
      uniforms[`uShadowFlow${i}`] = { value: field.shadowFlow };
      uniforms[`uShadowPointer${i}`] = { value: field.shadowPointer };
    }
  });
  uniforms.uShadowSoftness = { value: .45 };
  uniforms.uShadowStrength = { value: 1 };
  uniforms.uFluxStrength = { value: 1 };
  uniforms.uNeutralBounce = { value: 0 };
  uniforms.uReadingDensityRegion = { value: new THREE.Vector4(0, 0, 1, 1) };
  uniforms.uReadingDensityShape = { value: new THREE.Vector4(24, 0, 0, 0) };
  uniforms.uReadingDensityAmount = { value: 0 };
  uniforms.uReadingDensityJiggle = { value: 0 };
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = `varying vec3 vReceiverPosition;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvReceiverPosition = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    const declarations = fields.map((_, i) => `uniform float uFluxWeight${i}; uniform sampler2D uFlux${i}; uniform vec4 uFluxRect${i}; uniform vec2 uSpectralShift${i}; uniform vec3 uShadowIncident${i}; uniform vec4 uShadowGeom${i}; uniform vec4 uShadowShape${i}; uniform vec2 uShadowBox${i}; uniform vec3 uShadowTab${i}; uniform vec3 uShadowNeck${i}; uniform float uShadowFullness${i}; uniform vec3 uShadowTint${i}; uniform vec4 uShadowFlow${i}; uniform vec2 uShadowPointer${i};`).join('\n');
    const shadowFunction = `
    ${DENSITY_GLSL}
    ${TAB_GLSL}
    vec4 liquidShadow(vec2 p, vec3 incident, vec4 geom, vec4 shape, vec2 box, vec3 tab, vec3 neck, float fullness, vec3 tint, vec4 flow, vec2 pointer) {
      if (geom.w < 0.5) return vec4(1.0, 1.0, 1.0, 0.0);
      vec2 slope = -incident.xy / incident.z;
      vec2 bulk = p - geom.xy - slope * geom.z;
      if (tab.y > .001 || dot(neck, neck) > .001) bulk.y = tabUnwarp(bulk.x, bulk.y, (shape.x + geom.w) * 2.0, (box.y + geom.w) * 2.0, tab, neck);
      vec2 bounds = vec2(shape.x + geom.w, box.y + geom.w) + abs(slope) * shape.y + vec2(7.0);
      if (any(greaterThan(abs(bulk), bounds))) return vec4(1.0, 1.0, 1.0, 0.0);
      float envelope = pow(max(0.0, 1.0 - min(1.0, pow(bulk.y / max(shape.w, 1.0), 2.0))), 0.6);
      float fast = sin(bulk.x * 0.071 + bulk.y * 0.108 + flow.y * 5.2)
                 + 0.55 * sin(bulk.x * -0.051 + bulk.y * 0.085 - flow.y * 4.4);
      float slow = sin(bulk.x * 0.041 + bulk.y * 0.075 + flow.y * 0.65) * 0.24;
      float distanceToPointer = length(bulk - pointer);
      float indent = exp(-distanceToPointer * distanceToPointer / 490.0) * flow.z * 2.7;
      float ripple = sin(distanceToPointer * 0.22 - flow.y * 5.1) * exp(-distanceToPointer / 41.0) * flow.z;
      float wave = flow.x * (slow + fast * (flow.z * 0.72 + flow.w * 1.05) + ripple * 0.45) * envelope;
      float c = max(1.2, shape.y + wave - indent * 0.5);
      bulk += slope * indent * 0.5;
      float r2 = geom.w * geom.w;
      // Projection covariance of the oblate ellipsoid, swept along the pill
      // axis. Its analytic chord approximation has no shadow texture grid.
      float xx = r2 + c * c * slope.x * slope.x;
      float yy = r2 + c * c * slope.y * slope.y;
      float xy = c * c * slope.x * slope.y;
      float determinant = max(xx * yy - xy * xy, 0.0001);
      float axis = clamp(bulk.x - xy / yy * bulk.y, -shape.x, shape.x);
      float verticalAxis = box.y > 0.0 ? clamp(bulk.y, -box.y, box.y) : 0.0;
      if (box.y > 0.0) axis = clamp(bulk.x, -shape.x, shape.x);
      vec2 q = bulk - vec2(axis, verticalAxis);
      float footprint = (yy * q.x * q.x - 2.0 * xy * q.x * q.y + xx * q.y * q.y) / determinant;
      float edge = max(fwidth(footprint) * 1.3, 0.015) + 0.012 + uShadowSoftness * .075 + geom.z * 0.0005;
      float coverage = 1.0 - smoothstep(1.0 - edge, 1.0 + edge, footprint);
      float cap = step(max(shape.x - 0.2, 0.0), abs(axis));
      float verticalCap = box.y > 0.0 ? step(max(box.y - 0.2, 0.0), abs(verticalAxis)) : 1.0;
      float denominator = verticalCap * incident.y * incident.y / r2 + incident.z * incident.z / (c * c)
                        + cap * incident.x * incident.x / r2;
      float chord = 2.0 * sqrt(max(1.0 - footprint, 0.0)) / sqrt(max(denominator, 0.0001));
      if (box.y > 0.0) {
        // The flat film is much thinner than its meniscus. Carry that same
        // cross-section into the receiver instead of tinting it as a full slab.
        vec2 edgeDistance = abs(bulk) - vec2(shape.x, box.y);
        float insideDistance = max(0.0, geom.w - length(max(edgeDistance, vec2(0.0))) - min(max(edgeDistance.x, edgeDistance.y), 0.0));
        float span = min(geom.w * 0.72, ${JELLY_MATERIAL.window.rimSpan.toFixed(1)});
        float bead = exp(-pow((insideDistance - span * 0.34) / max(span * 0.32, 1.0), 2.0));
        float opticalHalfDepth = ${JELLY_MATERIAL.window.filmHalfDepth.toFixed(2)} + (shape.y - ${JELLY_MATERIAL.window.filmHalfDepth.toFixed(2)}) * bead;
        opticalHalfDepth = max(opticalHalfDepth, shape.y * ${TAB_DEPTH_RATIO.toFixed(2)} * tabDensityAt(bulk, (shape.x + geom.w) * 2.0, (box.y + geom.w) * 2.0, tab, neck));
        chord *= mix(opticalHalfDepth / max(shape.y, 1.0), 1.0, fullness);
      }
      vec3 transmission = exp(log(max(tint, vec3(0.0001))) * chord / shape.z);
      float castStrength = box.y > 0.0 ? mix(${JELLY_MATERIAL.window.castStrength.toFixed(2)}, .32, fullness) : 0.32;
      return vec4(mix(vec3(1.0), transmission, coverage * castStrength * uShadowStrength), coverage);
    }`;
    const samples = fields.map((_, i) => `{
      vec2 fluxUv = (vReceiverPosition.xy - uFluxRect${i}.xy) / uFluxRect${i}.zw;
      if (uFluxWeight${i} > .001 && all(greaterThanEqual(fluxUv, vec2(0.0))) && all(lessThanEqual(fluxUv, vec2(1.0)))) {
        vec2 separation = uSpectralShift${i} / uFluxRect${i}.zw;
        vec3 dispersedFlux = vec3(texture2D(uFlux${i}, fluxUv - separation).r,
                                  texture2D(uFlux${i}, fluxUv).g,
                                  texture2D(uFlux${i}, fluxUv + separation).b);
        photonLight += dispersedFlux * ${PHOTON_RANGE.toFixed(2)}${i === 3 ? ` * mix(${JELLY_MATERIAL.window.causticStrength.toFixed(2)}, 1.0, uShadowFullness3)` : ' * readingTransmission'} * uFluxWeight${i};
      }
    }`).join('\n');
    const shadowSamples = fields.map((_, i) => { return `if (uFluxWeight${i} > .001) {
      vec4 shadow = liquidShadow(vReceiverPosition.xy, uShadowIncident${i}, uShadowGeom${i}, uShadowShape${i}, uShadowBox${i}, uShadowTab${i}, uShadowNeck${i}, uShadowFullness${i}, uShadowTint${i}, uShadowFlow${i}, uShadowPointer${i});
      wavelengthReceiver *= mix(vec3(1.0), ${i === 3 ? 'shadow.rgb' : 'mix(vec3(1.0), shadow.rgb, readingTransmission)'}, uFluxWeight${i}); shadowCoverage = max(shadowCoverage, shadow.a);
      ${i === 3 ? 'panelCoverage = shadow.a;' : ''}
    }`; }).join('\n');
    shader.fragmentShader = `varying vec3 vReceiverPosition;\nuniform float uShadowSoftness; uniform float uShadowStrength; uniform float uFluxStrength;\nuniform float uNeutralBounce; uniform vec4 uReadingDensityRegion; uniform vec4 uReadingDensityShape; uniform float uReadingDensityAmount; uniform float uReadingDensityJiggle;\n${declarations}\n${shadowFunction}\n${shader.fragmentShader}`;
    // Keep cast silhouettes from the trio out of the window's reading area.
    // The dense outer lip still receives them; the thin center softly filters
    // their contrast without putting an opaque DOM card over the material.
    const readingFilter = `
      float readingTransmission = 1.0;
      if (uShadowGeom3.w > .5) {
        vec2 q = abs(vReceiverPosition.xy - uShadowGeom3.xy) - uShadowBox3;
        float d = length(max(q, vec2(0.0))) + min(max(q.x, q.y), 0.0) - uShadowGeom3.w;
        float readingCoverage = 1.0 - smoothstep(-24.0, -10.0, d);
        readingTransmission = mix(1.0, ${JELLY_MATERIAL.window.externalCastTransmission.toFixed(2)}, readingCoverage);
      }
    `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `vec3 photonLight = vec3(0.0);\nvec3 wavelengthReceiver = vec3(1.0);\nfloat shadowCoverage = 0.0;\nfloat panelCoverage = 0.0;\n${readingFilter}\n${samples}\n${shadowSamples}\nfloat densityTransmission = jellyDensityBackgroundTransmission(jellyDensity(vReceiverPosition.xy, uReadingDensityRegion, uReadingDensityAmount, uReadingDensityShape, uReadingDensityJiggle).w);\nwavelengthReceiver = mix(vec3(1.0), wavelengthReceiver, densityTransmission);\nphotonLight *= densityTransmission;\noutgoingLight += diffuseColor.rgb * uNeutralBounce * (shadowCoverage + panelCoverage * 0.55);\noutgoingLight *= wavelengthReceiver;\noutgoingLight += photonLight * diffuseColor.rgb * uFluxStrength / 3.14159265;\n#include <opaque_fragment>`);
  };
  material.customProgramCacheKey = () => 'movable-light-recoil-folder-receiver-v17';
  return uniforms;
}

function installVolumeThickness(material) {
  const data = new Uint8Array(33 * 4).fill(255);
  const palette = new THREE.DataTexture(data, 33, 1, THREE.RGBAFormat);
  palette.colorSpace = THREE.SRGBColorSpace;
  palette.minFilter = palette.magFilter = THREE.LinearFilter;
  palette.needsUpdate = true;
  const activityPalette = new THREE.DataTexture(new Uint8Array(33 * 2 * 4).fill(255), 33, 2, THREE.RGBAFormat);
  activityPalette.colorSpace = THREE.SRGBColorSpace;
  activityPalette.minFilter = activityPalette.magFilter = THREE.LinearFilter;
  activityPalette.needsUpdate = true;
  const flow = { activityPalette: { value: activityPalette }, pigmentPhase: { value: -1 }, fallbackDense: { value: new THREE.Color() }, region: { value: new THREE.Vector4(0, 0, 1, 1) }, activity: { value: new THREE.Vector4() }, gather: { value: 0 }, strain: { value: 0 }, reading: { value: new THREE.Vector2() }, depth: { value: POCKET.depth }, strength: { value: 0 }, palette: { value: palette } };
  material.userData.flow = flow;
  const densityPalette = new THREE.DataTexture(new Float32Array(33 * 4), 33, 1, THREE.RGBAFormat, THREE.FloatType);
  densityPalette.minFilter = densityPalette.magFilter = THREE.LinearFilter;
  densityPalette.needsUpdate = true;
  const density = { body: { value: new THREE.Vector3(1, 1, .5) }, shape: { value: new THREE.Vector4(24, 0, 0, 0) }, region: { value: new THREE.Vector4(0, 0, 1, 1) }, amount: { value: 0 }, jiggle: { value: 0 }, palette: { value: densityPalette } };
  material.userData.density = density;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uPigmentRegion: flow.region, uActivityShape: flow.activity, uActivityGather: flow.gather, uActivityStrain: flow.strain, uActivityReading: flow.reading, uPocketDepth: flow.depth, uPigmentStrength: flow.strength, uPigmentPalette: flow.palette, uActivityPalette: flow.activityPalette, uActivityPigmentPhase: flow.pigmentPhase, uActivityFallbackDense: flow.fallbackDense, uDensityBody: density.body, uDensityRegion: density.region, uDensityShape: density.shape, uDensityAmount: density.amount, uDensityJiggle: density.jiggle, uDensityPalette: density.palette });
    shader.vertexShader = `attribute float aVolumeDepth; varying float vVolumeDepth; varying vec2 vJellyPosition; varying vec3 vPocketX; varying vec3 vPocketY; varying vec3 vPocketZ;\n${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvVolumeDepth = aVolumeDepth; vJellyPosition = position.xy; vPocketX = normalMatrix * vec3(1.0, 0.0, 0.0); vPocketY = normalMatrix * vec3(0.0, 1.0, 0.0); vPocketZ = normalMatrix * vec3(0.0, 0.0, 1.0);');
    shader.fragmentShader = `varying float vVolumeDepth; varying vec2 vJellyPosition;
      varying vec3 vPocketX; varying vec3 vPocketY; varying vec3 vPocketZ;
      uniform vec4 uPigmentRegion; uniform vec4 uActivityShape; uniform float uActivityGather; uniform vec2 uActivityReading; uniform float uPocketDepth; uniform float uPigmentStrength; uniform sampler2D uPigmentPalette;
      uniform vec3 uDensityBody; uniform vec4 uDensityRegion; uniform vec4 uDensityShape; uniform float uDensityAmount; uniform float uDensityJiggle; uniform sampler2D uDensityPalette;
      ${POCKET_GLSL}\n${ACTIVITY_GLSL}\n${ACTIVITY_PIGMENT_GLSL}\n${DENSITY_GLSL}\n${shader.fragmentShader}`;
    // One field drives the whole interior before PBR lighting and transmission.
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 readingPoint = vJellyPosition / max(vec2(1.0), uActivityReading * .5);
      float activityReading = uActivityReading.x > .5 ? (1.0-smoothstep(.20,.54,abs(readingPoint.y))) * (1.0-smoothstep(.84,.97,abs(readingPoint.x))) : 0.0;
      vec4 densityField = uDensityAmount > .001 ? jellyDensity(vJellyPosition, uDensityRegion, uDensityAmount, uDensityShape, uDensityJiggle) : vec4(0.0);
    `).replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      roughnessFactor = min(1.0, roughnessFactor + .065 * densityField.w / .12 + activityReading * .11);
    `);
    // Change the optical normal before PBR lighting, clearcoat and transmission.
    // Pigment alone cannot bend a highlight or refract the receiving surface.
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      if (uDensityAmount > .001) {
        // The mesh carries the mass. Resolve its broad reading plane from
        // its analytic broad crown so lighting lives across the whole region.
        float densityFront = smoothstep(.2, .85, dot(normal, normalize(vPocketZ)));
        vec3 densityNormal = normalize(vPocketZ - densityField.x * normalize(vPocketX) - densityField.y * normalize(vPocketY));
        // The shared mesh samples density sparsely. Suppress its interpolated
        // fringe on nearby reading film, while retaining the outer window lip.
        vec2 zone = abs(vJellyPosition-uDensityRegion.xy)-uDensityRegion.zw*.5;
        float support = 1.0-smoothstep(0.0,28.0,max(zone.x,zone.y));
        vec2 parentQ = abs(vJellyPosition)-uDensityBody.xy*.5+uDensityBody.z;
        float parentDistance = length(max(parentQ,vec2(0.0)))+min(max(parentQ.x,parentQ.y),0.0)-uDensityBody.z;
        float readingFilm = smoothstep(12.0,22.0,-parentDistance);
        normal = normalize(mix(normal, densityNormal, densityFront * max(smoothstep(.1,1.1,densityField.z),support*readingFilm)));
        nonPerturbedNormal = normal;
      }
      // A broad, shallow reading plane belongs to the same volume. Quiet the
      // high-contrast moving reflection here; keep the shoulders expressive.
      float readingFront = smoothstep(.3,.86,dot(normal,normalize(vPocketZ)));
      normal = normalize(mix(normal, normalize(vPocketZ), activityReading * readingFront * .94));
      nonPerturbedNormal = normal;
      vec4 pocket = vec4(0.0);
      float pocketDepth = uPocketDepth * uPigmentStrength;
      if (pocketDepth > .001) {
        pocket = uActivityShape.w > .001 ? jellyActivity(vJellyPosition, uActivityShape, uActivityGather) : jellyPocket(vJellyPosition, uPigmentRegion);
        float pocketFront = smoothstep(.2, .85, dot(normal, normalize(vPocketZ)));
        normal = normalize(normal - pocketFront * (1.0 - activityReading * .8) * pocketDepth * (pocket.x * normalize(vPocketX) + pocket.y * normalize(vPocketY)));
        nonPerturbedNormal = normal;
      }
    `);
    const transmission = THREE.ShaderChunk.transmission_fragment
      .replace('material.thickness = thickness;', 'material.thickness = max(vVolumeDepth + densityField.z * 2.0 + pocket.z * pocketDepth * 2.0, 0.15);')
      // The collected activity keeps its absorption as thickness gathers.
      // Ordinary selection pockets retain their existing clearing correction.
      .replace('material.attenuationDistance = attenuationDistance;', 'material.attenuationDistance = attenuationDistance * (uActivityShape.w > .001 ? 1.0 / (1.0 + pocket.z * uPigmentStrength * uActivityGather * .2) : (1.0 + pocket.z * uPigmentStrength * .8)) * jellyDensityAttenuation(densityField.w, uDensityAmount);')
      .replace('material.attenuationColor = attenuationColor;', `
        material.attenuationColor = attenuationColor;
        if (densityField.w > .00001) {
          vec3 densityTint = texture2D(uDensityPalette, vec2((jellyDensityColorWeight(densityField.w) * 32.0 + .5) / 33.0, .5)).rgb;
          // A Spectral concentration map changes absorption within this same body.
          // The local clearing delta preserves the window's ongoing pigment sample.
          material.attenuationColor = clamp(attenuationColor + densityTint, vec3(0.0), vec3(1.0));
        }
        if (uPigmentStrength > 0.001) {
          float concentration = pocket.w * clamp(uPigmentStrength, 0.0, 1.0);
          if (uActivityShape.w > .001) {
            material.attenuationColor = jellyActivityPigment(material.attenuationColor, concentration);
          } else material.attenuationColor = texture2D(uPigmentPalette, vec2((concentration * 32.0 + .5) / 33.0, .5)).rgb;
        }
      `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <transmission_fragment>', transmission);
  };
  material.customProgramCacheKey = () => 'shared-liquid-current-pigment-v26';
}

function makeMeniscusGeometry(joinedTab = false) {
  // One closed indexed surface, reused for every size. Thin planar centers are
  // surrounded by an actual rounded fluid bead rather than a shader bevel.
  const perimeter = [];
  const straight = joinedTab ? 18 : 6, arc = 12;
  const edge = (cx, cy, nx, ny) => perimeter.push([cx, cy, nx, ny]);
  const topSegments = joinedTab ? 64 : straight;
  for (let i = 0; i < topSegments; i++) edge(-1 + i * 2 / topSegments, 1, 0, 1);
  for (let i = 0; i < arc; i++) { const a = Math.PI / 2 - i / arc * Math.PI / 2; edge(1, 1, Math.cos(a), Math.sin(a)); }
  for (let i = 0; i < straight; i++) edge(1, 1 - i * 2 / straight, 1, 0);
  for (let i = 0; i < arc; i++) { const a = -i / arc * Math.PI / 2; edge(1, -1, Math.cos(a), Math.sin(a)); }
  for (let i = 0; i < straight; i++) edge(1 - i * 2 / straight, -1, 0, -1);
  for (let i = 0; i < arc; i++) { const a = -Math.PI / 2 - i / arc * Math.PI / 2; edge(-1, -1, Math.cos(a), Math.sin(a)); }
  for (let i = 0; i < straight; i++) edge(-1, -1 + i * 2 / straight, -1, 0);
  for (let i = 0; i < arc; i++) { const a = Math.PI - i / arc * Math.PI / 2; edge(-1, 1, Math.cos(a), Math.sin(a)); }
  const radii = joinedTab ? [.08, .16, .24, .32, .40, .48, .56, .64, .70, .76, .82, .87, .91, .94, .965, .985, 1] : [.24, .50, .73, .84, .91, .955, .98, 1];
  const profile = [], indices = [], rings = [[], []], centers = [];
  const vertex = (point, radial, side) => { const index = profile.length / 6; profile.push(...point, radial, side); return index; };
  for (let side = 0; side < 2; side++) {
    centers[side] = vertex([0, 0, 0, 0], 0, side ? -1 : 1);
    for (let ring = 0; ring < radii.length; ring++) {
      if (side && ring === radii.length - 1) { rings[side].push(rings[0][ring]); continue; }
      rings[side].push(perimeter.map(point => vertex(point, radii[ring], ring === radii.length - 1 ? 0 : side ? -1 : 1)));
    }
    for (let i = 0; i < perimeter.length; i++) {
      const next = (i + 1) % perimeter.length;
      const first = rings[side][0];
      if (side) indices.push(centers[side], first[i], first[next]);
      else indices.push(centers[side], first[next], first[i]);
      for (let ring = 1; ring < radii.length; ring++) {
        const inner = rings[side][ring - 1], outer = rings[side][ring];
        if (side) indices.push(inner[i], outer[i], outer[next], inner[i], outer[next], inner[next]);
        else indices.push(inner[i], outer[next], outer[i], inner[i], inner[next], outer[next]);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(profile.length / 2), 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(profile.length / 2), 3));
  geometry.setIndex(indices);
  return { geometry, profile: new Float32Array(profile) };
}

function roundedDistance(body, x, y) {
  if (body.tab) y = tabUnwarpY(x / body.scaleXY, y / body.scaleXY, body.width, body.height, body.tab) * body.scaleXY;
  const r = body.r * body.scaleXY;
  const qx = Math.abs(x) - body.h * body.scaleXY;
  const qy = Math.abs(y) - body.hY * body.scaleXY;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

function meniscusProfile(body, x, y) {
  const distance = Math.max(0, -roundedDistance(body, x, y));
  const span = Math.min(body.r * 0.72, body.kind === 'menu' ? JELLY_MATERIAL.control.menuRimSpan : body.isBubble ? JELLY_MATERIAL.control.rimSpan : JELLY_MATERIAL.window.rimSpan);
  const rim = Math.exp(-(((distance - span * 0.34) / Math.max(span * 0.32, 1)) ** 2));
  const roll = Math.sqrt(Math.max(0, 1 - Math.exp(-distance / (body.isBubble ? 1.1 : 2.1))));
  const core = body.isBubble ? JELLY_MATERIAL.control.filmHalfDepth : JELLY_MATERIAL.window.filmHalfDepth;
  const phase = x * 0.034 + y * 0.041 + body.time * 1.15;
  const crown = volumeCrown(distance, Math.min(body.width, body.height) / 2);
  const drift = Math.sin(phase) * body.waveAmplitude * (rim + crown * .3) * 0.55;
  const baseY = tabUnwarpY(x / body.scaleXY, y / body.scaleXY, body.width, body.height, body.tab);
  const density = tabDensity(x / body.scaleXY, baseY, body.width, body.height, body.tab);
  const halfZ = Math.max(volumeHeight(core, body.c, rim, roll, crown, (body.fullness ?? volumeFullness(body.kind || 'window', body.grouped))), (core + (body.c * TAB_DEPTH_RATIO - core) * density) * roll) + drift * roll;
  const fieldHeight = body.density ? densityFieldProfile(x - body.density.x, y - body.density.y, body.density).height : 0;
  return [Math.max(0, halfZ + fieldHeight), Math.sin(phase * 0.63) * body.waveAmplitude * rim * 0.14];
}

function makeJelly(scene, index, field, panel = false) {
  // A cached rounded-box grid lets the panel follow every animated DOM bound
  // without allocating a new geometry. The three controls retain their capsule.
  const lens = panel ? makeMeniscusGeometry(index === 3) : null;
  const geometry = panel ? lens.geometry : new THREE.CapsuleGeometry(1, 1, 10, 40, 14);
  if (!panel) geometry.rotateZ(-Math.PI / 2);
  const base = geometry.attributes.position.array.slice();
  const rounded = lens?.profile || null;
  geometry.setAttribute('aVolumeDepth', new THREE.BufferAttribute(new Float32Array(base.length / 3), 1));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, metalness: 0, roughness: 0.055, transparent: !panel,
    transmission: 1, thickness: 24, ior: 1.42,
    attenuationColor: colorFrom([0.01, 0.23, 0.98]), attenuationDistance: 38,
    clearcoat: 0.22, clearcoatRoughness: 0.035,
    envMapIntensity: 0.82, specularIntensity: 1, dispersion: 0.025,
  });
  installVolumeThickness(material);
  installReadingFilm(material);
  if (panel) material.dispersion = 0;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = panel ? 'Expanding jelly content container' : `Liquid volume ${index + 1}`;
  mesh.castShadow = true;
  // Block the unrefracted direct white beam, then restore its transmitted
  // portion with the RGB photon pass. Partial white coverage double-counts it.
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  mesh.customDepthMaterial = depth;
  mesh.frustumCulled = false;
  scene.add(mesh);
  return { lightDirection: LIGHT_DIRECTION.clone(), lightColor: [1, 1, 1], lightPower: 1, lightSoftness: .45, mesh, geometry, material, depth, base, rounded, panel, hY: 0, field, toneColor: material.attenuationColor.clone(), toneGoal: material.attenuationColor.clone(), toneRGB: [0, 0, 0], toneTarget: null, toneProgress: 1, tonePalette: null, grouped: false, traceState: new Float64Array(14), selection: 0, hover: 0, pressed: 0, stir: 0, width: 1, height: 1, r: 1, h: 0, c: 1, centerZ: 2, waveAmplitude: 0, time: 0, pointerX: 10000, pointerY: 10000, scaleXY: 1, live: false };
}

function setMaterialTone(body, target, delta, first = false, progress = null) {
  const hex = `#${target.getHexString(THREE.SRGBColorSpace)}`;
  body.toneGoal.copy(target);
  if (first) {
    body.toneTarget = hex; body.tonePalette = null; body.toneProgress = 1;
    body.toneColor.copy(target);
  } else {
    if (hex !== body.toneTarget) {
      body.tonePalette = createJellyPalette(`#${body.toneColor.getHexString(THREE.SRGBColorSpace)}`, hex);
      body.toneTarget = hex; body.toneProgress = 0;
    }
    if (body.tonePalette) {
      body.toneProgress = progress === null ? clamp(body.toneProgress + delta * 1000 / MOTION.pigment) : clamp(progress);
      body.tonePalette.sampleRGB(progress === null ? sampleBezier(MOTION.pigmentCurve, body.toneProgress) : body.toneProgress, body.toneRGB);
      body.toneColor.setRGB(body.toneRGB[0], body.toneRGB[1], body.toneRGB[2], THREE.SRGBColorSpace);
      if (body.toneProgress > 0.999) { body.toneColor.copy(target); body.tonePalette = null; body.toneProgress = 1; }
    }
  }
  body.material.attenuationColor.copy(body.toneColor);
}

function makeSelectionRim(scene, index) {
  const body = makeJelly(scene, index, null, true);
  const template = body.rounded;
  const perimeterCount = 72, crossSections = 12;
  const profile = new Float32Array(perimeterCount * crossSections * 6);
  const indices = [];
  for (let cross = 0; cross < crossSections; cross++) {
    const angle = cross / crossSections * Math.PI * 2;
    for (let point = 0; point < perimeterCount; point++) {
      const source = (point + 1) * 6, at = (cross * perimeterCount + point) * 6;
      profile[at] = template[source]; profile[at + 1] = template[source + 1];
      profile[at + 2] = template[source + 2]; profile[at + 3] = template[source + 3];
      profile[at + 4] = (1 + Math.cos(angle)) * 0.5;
      profile[at + 5] = Math.sin(angle);
      const here = cross * perimeterCount + point;
      const next = cross * perimeterCount + (point + 1) % perimeterCount;
      const nextCross = ((cross + 1) % crossSections) * perimeterCount;
      const above = nextCross + point, diagonal = nextCross + (point + 1) % perimeterCount;
      indices.push(here, next, diagonal, here, diagonal, above);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(profile.length / 2), 3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(profile.length / 2), 3));
  geometry.setAttribute('aVolumeDepth', new THREE.BufferAttribute(new Float32Array(profile.length / 6), 1));
  geometry.setIndex(indices);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  body.geometry.dispose(); body.geometry = geometry; body.mesh.geometry = geometry;
  body.rounded = profile;
  body.mesh.name = `Persistent connected selection rim ${index}`;
  body.mesh.visible = false; body.mesh.castShadow = false;
  body.material.transparent = true; body.material.depthWrite = false;
  body.clipPlanes = Array.from({ length: 4 }, () => new THREE.Plane(new THREE.Vector3(1, 0, 0), 100000));
  body.material.clippingPlanes = body.clipPlanes;
  body.isSelection = true;
  return { body, id: null, motion: null };
}

function deformSelectionRim(body, timestamp, moving, travelling) {
  const key = [body.width, body.height, body.r, Math.round(body.c * 100), Boolean(travelling)].join(',');
  // A committed contour is structural. Reuse it at rest instead of rebuilding
  // normals for an imperceptible .045px ambient wave on every selection group.
  if (key === body.geometryKey && (!moving || !travelling)) return;
  const positions = body.geometry.attributes.position.array;
  const depth = body.geometry.attributes.aVolumeDepth.array;
  const span = Math.min(JELLY_MATERIAL.control.rimSpan, body.r * 0.85) * (0.28 + Math.min(body.assimilationDepth, 1) * 0.72);
  for (let vertex = 0; vertex < depth.length; vertex++) {
    const at = vertex * 6, index = vertex * 3;
    const inset = body.rounded[at + 4] * span;
    const point = body.contour.points[vertex % 72];
    const centerX = body.contour.bounds.x + body.contour.bounds.width / 2;
    const centerY = body.contour.bounds.y + body.contour.bounds.height / 2;
    const x = point.x - centerX - point.nx * inset;
    const y = centerY - point.y + point.ny * inset;
    const cross = body.rounded[at + 5];
    positions[index] = x; positions[index + 1] = y;
    positions[index + 2] = cross * body.c + (moving && travelling ? Math.sin(x * 0.03 + y * 0.04 + body.time * 1.2) * 0.045 * Math.min(body.assimilationDepth, 1) : 0);
    depth[vertex] = Math.max(0.15, Math.abs(cross) * body.c * 2);
  }
  body.geometry.attributes.position.needsUpdate = true;
  body.geometry.attributes.aVolumeDepth.needsUpdate = true;
  body.geometry.computeVertexNormals();
  body.geometry.boundingSphere.radius = Math.hypot(body.width / 2, body.height / 2, body.c + 1);
  body.geometryKey = key; body.lastGeometry = timestamp;
}

function liquidProfile(body, x, y) {
  if (body.panel) return meniscusProfile(body, x, y);
  const nx = x / Math.max(body.width / 2, 1);
  const ny = y / Math.max(body.height / 2, 1);
  const envelope = Math.max(0, 1 - Math.min(1, ny * ny)) ** 0.6;
  const fast = Math.sin(x * 0.071 + y * 0.108 + body.time * 5.2)
             + 0.55 * Math.sin(x * -0.051 + y * 0.085 - body.time * 4.4);
  const slow = Math.sin(x * 0.041 + y * 0.075 + body.time * 0.65) * 0.24;
  const distance = Math.hypot(x - body.pointerX, y - body.pointerY);
  const local = Math.exp(-(distance * distance) / 490) * body.hover;
  const ripple = Math.sin(distance * 0.22 - body.time * 5.1) * Math.exp(-distance / 41) * body.hover;
  const wave = body.waveAmplitude * (slow + fast * (body.hover * 0.72 + body.stir * 1.05) + ripple * 0.45) * envelope;
  const indent = local * (2.7 + body.pressed * 2.4);
  const halfZ = Math.max(1.2, body.c + wave - indent * 0.5);
  return [halfZ, -indent * 0.5 + Math.sin(nx * 2.2) * body.stir * 0.3];
}

function deformJelly(body) {
  const positions = body.geometry.attributes.position.array;
  const depths = body.geometry.attributes.aVolumeDepth.array;
  const activityOffset = { x: 0, y: 0, z: 0 };
  const cacheKey = body.panel ? geometrySampleKey([body.width, body.height, body.r, body.h, body.hY]) : '';
  if (body.panel && cacheKey !== body.profileCacheKey) {
    body.profileCacheKey = cacheKey;
    body.profileCache ||= new Float32Array(body.base.length / 3 * 5);
    for (let vertex = 0; vertex < body.base.length / 3; vertex++) {
      const at = vertex * 6, cached = vertex * 5, radial = body.rounded[at + 4];
      const x = (body.rounded[at] * body.h + body.rounded[at + 2] * body.r) * radial;
      const y = (body.rounded[at + 1] * body.hY + body.rounded[at + 3] * body.r) * radial;
      const qx = Math.abs(x) - body.h, qy = Math.abs(y) - body.hY;
      const distance = Math.max(0, body.r - Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) - Math.min(Math.max(qx, qy), 0));
      const span = Math.min(body.r * 0.72, body.kind === 'menu' ? JELLY_MATERIAL.control.menuRimSpan : body.isBubble ? JELLY_MATERIAL.control.rimSpan : JELLY_MATERIAL.window.rimSpan);
      body.profileCache[cached] = x; body.profileCache[cached + 1] = y;
      body.profileCache[cached + 2] = Math.exp(-(((distance - span * 0.34) / Math.max(span * 0.32, 1)) ** 2));
      body.profileCache[cached + 3] = Math.sqrt(Math.max(0, 1 - Math.exp(-distance / (body.isBubble ? 1.1 : 2.1))));
      body.profileCache[cached + 4] = volumeCrown(distance, Math.min(body.width, body.height) / 2);
    }
  }
  // The parent reading field is stationary between disclosures. Cache its
  // expensive folder/neck samples while the shallow ambient wave keeps moving.
  // Morphs and density input invalidate this cache at their actual live bounds.
  const cacheSurface = body.panel && !body.isBubble && body.scaleXY === 1;
  const surfaceKey = cacheSurface ? geometrySampleKey([body.profileCacheKey, body.tab?.width, body.tab?.lift, body.tab?.amount,
    body.tab?.neck?.pull, body.tab?.neck?.pinch, body.tab?.neck?.wobble,
    body.density?.x, body.density?.y, body.density?.width, body.density?.height,
    body.density?.amount, body.density?.edge, body.density?.flow, body.density?.fold, body.density?.folder, body.density?.jiggle]) : null;
  if (cacheSurface && surfaceKey !== body.surfaceCacheKey) {
    body.surfaceCache ||= new Float32Array(body.base.length);
    for (let vertex = 0; vertex < body.base.length / 3; vertex++) {
      const x = body.profileCache[vertex * 5], baseY = body.profileCache[vertex * 5 + 1];
      const y = body.tab ? tabWarpY(x, baseY, body.width, body.height, body.tab) : baseY;
      body.surfaceCache[vertex * 3] = y;
      body.surfaceCache[vertex * 3 + 1] = body.tab ? tabDensity(x, baseY, body.width, body.height, body.tab) : 0;
      body.surfaceCache[vertex * 3 + 2] = body.density ? densityFieldProfile(x - body.density.x, y - body.density.y, body.density).height : 0;
    }
    body.surfaceCacheKey = surfaceKey;
    body.surfaceCacheBuilds = (body.surfaceCacheBuilds || 0) + 1;
  }
  for (let i = 0, vertex = 0; i < body.base.length; i += 3, vertex++) {
    const bx = body.base[i];
    const at = vertex * 6;
    const radial = body.panel ? body.rounded[at + 4] : 0;
    const cached = vertex * 5;
    const x = body.panel
      ? body.profileCache[cached] * body.scaleXY
      : (Math.abs(bx) <= 0.5 ? bx * body.h * 2 : Math.sign(bx) * body.h + (bx - Math.sign(bx) * 0.5) * body.r) * body.scaleXY;
    const baseY = body.panel
      ? body.profileCache[cached + 1] * body.scaleXY
      : body.base[i + 1] * body.r * body.scaleXY;
    const y = cacheSurface ? body.surfaceCache[i] : body.tab ? tabWarpY(x / body.scaleXY, baseY / body.scaleXY, body.width, body.height, body.tab) * body.scaleXY : baseY;
    let halfZ, shift, localDensity = 0;
    if (body.panel) {
      const rim = body.profileCache[cached + 2], roll = body.profileCache[cached + 3];
      const phase = x * 0.034 + y * 0.041 + body.time * 1.15;
      const core = body.isBubble ? JELLY_MATERIAL.control.filmHalfDepth : JELLY_MATERIAL.window.filmHalfDepth;
      const crown = body.profileCache[cached + 4];
      const fullness = (body.fullness ?? volumeFullness(body.kind || 'window', body.grouped));
      halfZ = volumeHeight(core, body.c, rim, roll, crown, fullness)
        + (Math.sin(phase) * body.waveAmplitude * (rim + crown * .3) * .55) * roll;
      const density = cacheSurface ? body.surfaceCache[i + 1] : body.tab ? tabDensity(x / body.scaleXY, baseY / body.scaleXY, body.width, body.height, body.tab) : 0;
      halfZ = Math.max(halfZ, (core + (body.c * TAB_DEPTH_RATIO - core) * density) * roll);
      if (body.density) {
        localDensity = cacheSurface ? body.surfaceCache[i + 2] : densityFieldProfile(x - body.density.x, y - body.density.y, body.density).height;
        halfZ += localDensity;
      }
      shift = Math.sin(phase * 0.63) * body.waveAmplitude * rim * 0.14;
    } else [halfZ, shift] = liquidProfile(body, x, y);
    if (body.activityShape) {
      activityDisplacement(x, y, body.activityShape, activityOffset);
      halfZ += activityOffset.z;
    }
    const profileZ = body.panel ? body.rounded[at + 5] : body.base[i + 2];
    const z = profileZ * halfZ + shift;
    const neck = !body.panel && body.joinStrain ? body.joinStrain * smoothstep(.18, 1, (x / body.scaleXY + body.width / 2) / body.width) : 0;
    positions[i] = x + neck * 18 + activityOffset.x;
    positions[i + 1] = y * (1 - neck * .62) + neck * 6 + activityOffset.y;
    positions[i + 2] = z;
    // Density thickness is analytic per fragment; interpolating it across
    // large triangles would leak a star-shaped dark fringe outside the region.
    depths[vertex] = Math.max(0.2, Math.abs(profileZ) * (halfZ - localDensity - activityOffset.z) * 2);
  }
  body.geometry.attributes.position.needsUpdate = true;
  body.geometry.attributes.aVolumeDepth.needsUpdate = true;
  body.geometry.computeVertexNormals();
  body.geometry.boundingSphere.radius = Math.hypot(body.width / 2, body.height / 2 + tabMaximumLift(body.tab), body.c * 1.7 + 7) * body.scaleXY;
}

function updateGeometry(body, timestamp, moving) {
  // Input/bounds changes remain immediate. Only quiet ambient deformation has a
  // lower cadence; paused geometry is reused without rebuilding normals.
  const key = geometrySampleKey([body.width, body.height, body.r, Math.round(body.hover * 10000),
    Math.round(body.pressed * 10000), body.stir, body.joinStrain, body.fullness, Math.round(body.c * 100),
    body.pointerX, body.pointerY, body.activityShape?.phase, body.activityShape?.gain, body.activityShape?.gather, body.activityShape?.breath, body.activityShape?.strain,
    body.density?.x, body.density?.y, body.density?.width, body.density?.height, body.density?.amount, body.density?.edge, body.density?.flow, body.density?.fold, body.density?.folder, body.density?.jiggle, body.tab?.width, body.tab?.lift, body.tab?.amount, body.tab?.neck?.pull, body.tab?.neck?.pinch, body.tab?.neck?.wobble]);
  if ((!body.panel && !body.isBubble && body.docked < .001) || key !== body.geometryKey || (moving && timestamp - (body.lastGeometry || -1000) >= 1000 / (body.isBubble ? 24 : 30))) {
    deformJelly(body);
    body.geometryKey = key; body.lastGeometry = timestamp;
  }
}

function fitSurfaceGeometry(body, capsule) {
  if (body.capsule === capsule) return;
  const lens = capsule ? null : makeMeniscusGeometry();
  const geometry = capsule ? new THREE.CapsuleGeometry(1, 1, 8, 32, 6) : lens.geometry;
  if (capsule) geometry.rotateZ(-Math.PI / 2);
  const base = geometry.attributes.position.array.slice();
  geometry.setAttribute('aVolumeDepth', new THREE.BufferAttribute(new Float32Array(base.length / 3), 1));
  geometry.attributes.position.setUsage(THREE.DynamicDrawUsage);
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1);
  body.geometry.dispose();
  body.geometry = body.mesh.geometry = geometry;
  body.base = base; body.rounded = lens?.profile || null; body.panel = !capsule; body.capsule = capsule;
  body.profileCache = null; body.profileCacheKey = body.geometryKey = null;
}

function prepareCapsuleTrace(body) {
  const s = body.traceState;
  s[0] = body.r * body.scaleXY; s[1] = body.h * body.scaleXY;
  s[2] = 1 / Math.max(body.width / 2, 1); s[3] = 1 / Math.max(body.height / 2, 1);
  s[4] = body.c; s[5] = body.time; s[6] = body.waveAmplitude;
  s[7] = body.hover; s[8] = body.pressed; s[9] = body.stir;
  s[10] = body.pointerX; s[11] = body.pointerY; s[12] = body.centerZ;
}

function capsuleDistance(body, x, y, z) {
  // This is the same capsule height field as liquidProfile, evaluated without
  // per-step arrays, general hypot normalization or zero-weight wave terms.
  const s = body.traceState, r = s[0];
  const qx = x - Math.max(-s[1], Math.min(s[1], x));
  const hover = s[7], stir = s[9], amplitude = s[6], time = s[5];
  let indent = 0, ripple = 0, wave = 0;
  if (hover > 0) {
    const dx = x - s[10], dy = y - s[11], distance2 = dx * dx + dy * dy;
    // Beyond600px, this contribution is below one millionth of a pixel.
    if (distance2 < 360000) {
      indent = Math.exp(-distance2 / 490) * hover * (2.7 + s[8] * 2.4);
      if (amplitude > 0) {
        const distance = Math.sqrt(distance2);
        ripple = Math.sin(distance * 0.22 - time * 5.1) * Math.exp(-distance / 41) * hover;
      }
    }
  }
  if (amplitude > 0) {
    const ny = y * s[3];
    const envelope = Math.pow(Math.max(0, 1 - Math.min(1, ny * ny)), 0.6);
    const slow = Math.sin(x * 0.041 + y * 0.075 + time * 0.65) * 0.24;
    let fast = 0;
    if (hover > 0 || stir > 0) fast = Math.sin(x * 0.071 + y * 0.108 + time * 5.2)
      + 0.55 * Math.sin(x * -0.051 + y * 0.085 - time * 4.4);
    wave = amplitude * (slow + fast * (hover * 0.72 + stir * 1.05) + ripple * 0.45) * envelope;
  }
  const halfZ = Math.max(1.2, s[4] + wave - indent * 0.5);
  const shift = -indent * 0.5 + (stir > 0 ? Math.sin(x * s[2] * 2.2) * stir * 0.3 : 0);
  const dz = (z - s[12] - shift) * r / halfZ;
  return (Math.sqrt(qx * qx + y * y + dz * dz) - r) * Math.min(1, halfZ / r) * 0.58;
}

function signedLiquid(body, x, y, z) {
  if (!body.panel) return capsuleDistance(body, x, y, z);
  const [halfZ, shift] = meniscusProfile(body, x, y);
  return Math.max(roundedDistance(body, x, y), Math.abs(z - body.centerZ - shift) - halfZ) * 0.58;
}

function surfaceNormal(body, x, y, z) {
  const e = 0.13;
  const nx = signedLiquid(body, x + e, y, z) - signedLiquid(body, x - e, y, z);
  const ny = signedLiquid(body, x, y + e, z) - signedLiquid(body, x, y - e, z);
  const nz = signedLiquid(body, x, y, z + e) - signedLiquid(body, x, y, z - e);
  const length = Math.hypot(nx, ny, nz) || 1;
  return [nx / length, ny / length, nz / length];
}

function refract(direction, normal, eta) {
  const dot = direction[0] * normal[0] + direction[1] * normal[1] + direction[2] * normal[2];
  const k = 1 - eta * eta * (1 - dot * dot);
  if (k < 0) return null;
  const n = eta * dot + Math.sqrt(k);
  return [eta * direction[0] - n * normal[0], eta * direction[1] - n * normal[1], eta * direction[2] - n * normal[2]];
}

function marchLiquid(body, start, direction, inside = false) {
  const bounds = [body.width * body.scaleXY / 2 + 0.5, body.height * body.scaleXY / 2 + 0.5, body.c * 1.7 + 7];
  const center = [0, 0, body.centerZ];
  let near = 0, far = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    if (Math.abs(direction[axis]) < 0.00001) {
      if (Math.abs(start[axis] - center[axis]) > bounds[axis]) return null;
    } else {
      let a = (center[axis] - bounds[axis] - start[axis]) / direction[axis];
      let b = (center[axis] + bounds[axis] - start[axis]) / direction[axis];
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a); far = Math.min(far, b);
      if (near > far) return null;
    }
  }
  let x = start[0] + direction[0] * near, y = start[1] + direction[1] * near, z = start[2] + direction[2] * near;
  let travel = 0;
  for (let step = 0; step < 54; step++) {
    const distance = signedLiquid(body, x, y, z);
    if ((!inside && distance < 0.055) || (inside && distance > -0.035 && travel > 0.18)) return [x, y, z];
    const advance = Math.max(0.07, Math.abs(distance) * (inside ? 0.78 : 0.9));
    x += direction[0] * advance; y += direction[1] * advance; z += direction[2] * advance;
    travel += advance;
    if (z < -1 || travel > far - near + 0.1) return null;
  }
  return null;
}

function splat(field, worldX, worldY, energy, cellArea) {
  const [left, bottom, width, height] = field.rect.toArray();
  const tx = (worldX - left) / width * field.width - 0.5;
  const ty = (worldY - bottom) / height * field.height - 0.5;
  const ix = Math.floor(tx), iy = Math.floor(ty);
  const texelArea = (width / field.width) * (height / field.height);
  const scale = cellArea / texelArea;
  const kernel = field.kernel || [0.06136, 0.24477, 0.38774, 0.24477, 0.06136];
  const radius = (kernel.length - 1) / 2;
  for (let ky = -radius; ky <= radius; ky++) for (let kx = -radius; kx <= radius; kx++) {
    const px = ix + kx, py = iy + ky;
    if (px < 0 || py < 0 || px >= field.width || py >= field.height) continue;
    const w = kernel[kx + radius] * kernel[ky + radius] * scale;
    const at = (py * field.width + px) * 3;
    field.accumulation[at] += energy[0] * w;
    field.accumulation[at + 1] += energy[1] * w;
    field.accumulation[at + 2] += energy[2] * w;
  }
}

function uploadFlux(field) {
  for (let i = 0, at = 0; i < field.accumulation.length; i += 3, at += 4) {
    field.bytes[at] = Math.round(clamp(field.accumulation[i] / PHOTON_RANGE) * 255);
    field.bytes[at + 1] = Math.round(clamp(field.accumulation[i + 1] / PHOTON_RANGE) * 255);
    field.bytes[at + 2] = Math.round(clamp(field.accumulation[i + 2] / PHOTON_RANGE) * 255);
    field.bytes[at + 3] = 255;
  }
  field.texture.needsUpdate = true;
}

function traceCaustics(body, mobile, irradiance) {
  prepareCapsuleTrace(body);
  const field = body.field;
  field.accumulation.fill(0);
  const extentX = body.width / 2 + body.c * 1.8 + 25;
  const extentY = body.height / 2 + body.c * 1.8 + 25;
  const offsetX = -body.lightDirection.x / body.lightDirection.z * body.centerZ;
  const offsetY = -body.lightDirection.y / body.lightDirection.z * body.centerZ;
  field.rect.set(body.mesh.position.x - extentX + offsetX, body.mesh.position.y - extentY + offsetY, extentX * 2, extentY * 2);
  const countX = mobile ? 23 : 29;
  const countY = mobile ? 17 : 21;
  const top = body.centerZ + body.c * 1.8 + 9;
  const sourceX = body.width + body.c * 1.9;
  const sourceY = body.height + body.c * 1.9;
  const cellArea = sourceX * sourceY / (countX * countY);
  // Match reconstruction bandwidth to incident sample spacing. The footprint
  // remains energy-normalized, avoiding visible photon rows inside the glass.
  const sigma = Math.max(0.82, Math.max(sourceX / countX / (extentX * 2 / field.width), sourceY / countY / (extentY * 2 / field.height)) * 0.46);
  const radius = Math.min(5, Math.ceil(sigma * (1.4 + body.lightSoftness * 2.4)));
  field.kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const kernelSum = field.kernel.reduce((sum, v) => sum + v, 0);
  field.kernel = field.kernel.map(v => v / kernelSum);
  const incoming = [body.lightDirection.x, body.lightDirection.y, body.lightDirection.z];
  const tint = body.material.attenuationColor.toArray();
  const distance = body.material.attenuationDistance;
  const f0 = ((1 - body.material.ior) / (1 + body.material.ior)) ** 2;
  const entryEta = 1 / body.material.ior;
  for (let iy = 0; iy < countY; iy++) for (let ix = 0; ix < countX; ix++) {
    // The deterministic stratified lattice is uniform in the incident plane.
    const jitterX = (Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453) % 1;
    const jitterY = (Math.sin(ix * 269.5 + iy * 183.3) * 43758.5453) % 1;
    const x = ((ix + 0.5 + jitterX * 0.32) / countX - 0.5) * sourceX - incoming[0] * top / -incoming[2] * 0.34;
    const y = ((iy + 0.5 + jitterY * 0.32) / countY - 0.5) * sourceY - incoming[1] * top / -incoming[2] * 0.34;
    const entry = marchLiquid(body, [x, y, top], incoming);
    if (!entry) continue;
    const n1 = surfaceNormal(body, ...entry);
    const transmitted = refract(incoming, n1, entryEta);
    if (!transmitted) continue;
    const innerStart = entry.map((v, i) => v + transmitted[i] * 0.24);
    const exit = marchLiquid(body, innerStart, transmitted, true);
    if (!exit) continue;
    const n2 = surfaceNormal(body, ...exit).map(v => -v);
    const outgoing = refract(transmitted, n2, body.material.ior);
    if (!outgoing || outgoing[2] >= -0.035) continue;
    const path = Math.hypot(exit[0] - entry[0], exit[1] - entry[1], exit[2] - entry[2]);
    const incidence = clamp(-(incoming[0] * n1[0] + incoming[1] * n1[1] + incoming[2] * n1[2]));
    const emergence = clamp(-(transmitted[0] * n2[0] + transmitted[1] * n2[1] + transmitted[2] * n2[2]));
    const fresnel = (1 - (f0 + (1 - f0) * (1 - incidence) ** 5)) * (1 - (f0 + (1 - f0) * (1 - emergence) ** 5));
    const energy = tint.map((c, channel) => body.lightColor[channel] * Math.exp(Math.log(Math.max(c, 0.0001)) * path / distance) * fresnel * irradiance * body.lightPower * -incoming[2]);
    const planeTime = -exit[2] / outgoing[2];
    splat(field, body.mesh.position.x + exit[0] + outgoing[0] * planeTime, body.mesh.position.y + exit[1] + outgoing[1] * planeTime, energy, cellArea);
  }
  uploadFlux(field);
}

function traceMeniscusCaustics(body, mobile, irradiance) {
  // Directly sample the actual analytic top surface. A single bounded internal
  // chord and parallel back interface replace hundreds of SDF marching steps.
  const field = body.field;
  field.accumulation.fill(0);
  const extentX = body.width / 2 + body.c * 1.8 + 25;
  const sourceHeight = body.height + tabMaximumLift(body.tab);
  const extentY = body.height / 2 + tabMaximumLift(body.tab) + body.c * 1.8 + 25;
  const shiftX = -body.lightDirection.x / body.lightDirection.z * body.centerZ;
  const shiftY = -body.lightDirection.y / body.lightDirection.z * body.centerZ;
  field.rect.set(body.mesh.position.x - extentX + shiftX, body.mesh.position.y - extentY + shiftY, extentX * 2, extentY * 2);
  const countX = mobile ? 8 : 9, countY = mobile ? 8 : 9;
  const cellArea = body.width * sourceHeight / (countX * countY);
  const sigma = Math.max(0.9, Math.max(body.width / countX / (extentX * 2 / field.width), body.height / countY / (extentY * 2 / field.height)) * 0.48);
  const radius = Math.min(5, Math.ceil(sigma * (1.4 + body.lightSoftness * 2.4)));
  field.kernel = Array.from({ length: radius * 2 + 1 }, (_, i) => Math.exp(-0.5 * ((i - radius) / sigma) ** 2));
  const sum = field.kernel.reduce((a, v) => a + v, 0);
  field.kernel = field.kernel.map(v => v / sum);
  const incoming = body.lightDirection.toArray(), tint = body.material.attenuationColor.toArray();
  const f0 = ((1 - body.material.ior) / (1 + body.material.ior)) ** 2;
  const e = 0.45;
  for (let iy = 0; iy < countY; iy++) for (let ix = 0; ix < countX; ix++) {
    const jitter = Math.sin(ix * 127.1 + iy * 311.7) * 43758.5453 % 1;
    const x = ((ix + 0.5 + jitter * 0.22) / countX - 0.5) * body.width;
    const y = (iy + 0.5 - jitter * 0.22) / countY * sourceHeight - body.height / 2;
    if (roundedDistance(body, x, y) >= -0.2) continue;
    const [height, offset] = meniscusProfile(body, x, y);
    const gx = (meniscusProfile(body, x + e, y)[0] - meniscusProfile(body, x - e, y)[0]) / (2 * e);
    const gy = (meniscusProfile(body, x, y + e)[0] - meniscusProfile(body, x, y - e)[0]) / (2 * e);
    const length = Math.hypot(gx, gy, 1);
    const entryNormal = [-gx / length, -gy / length, 1 / length];
    const inside = refract(incoming, entryNormal, 1 / body.material.ior);
    if (!inside || inside[2] >= -0.1) continue;
    const path = Math.min(body.c * 8, 2 * height / -inside[2]);
    const exitX = x + inside[0] * path, exitY = y + inside[1] * path;
    if (roundedDistance(body, exitX, exitY) > 0) continue;
    const outgoing = refract(inside, [gx / length, gy / length, 1 / length], body.material.ior);
    if (!outgoing || outgoing[2] >= -0.08) continue;
    const exitZ = body.centerZ - height + offset;
    const planeTime = -exitZ / outgoing[2];
    const incidence = clamp(-(incoming[0] * entryNormal[0] + incoming[1] * entryNormal[1] + incoming[2] * entryNormal[2]));
    const fresnel = (1 - f0) * (1 - f0 - (1 - f0) * (1 - incidence) ** 5);
    const concentration = body.density ? densityFieldProfile(x - body.density.x, y - body.density.y, body.density).pigment : 0;
    const palette = body.material.userData.density.palette.value.image.data;
    const sample = densityColorWeight(concentration) * 32, lower = Math.floor(sample), upper = Math.min(32, lower + 1);
    const distance = body.material.attenuationDistance * densityAttenuation(concentration, body.density?.amount || 0);
    const energy = tint.map((c, channel) => {
      const localTint = clamp(c + lerp(palette[lower * 4 + channel], palette[upper * 4 + channel], sample - lower));
      return body.lightColor[channel] * Math.exp(Math.log(Math.max(localTint, .0001)) * path / distance) * fresnel * irradiance * body.lightPower * -incoming[2];
    });
    splat(field, body.mesh.position.x + exitX + outgoing[0] * planeTime, body.mesh.position.y + exitY + outgoing[1] * planeTime, energy, cellArea);
  }
  uploadFlux(field);
}

export function createOptics(canvas, { getScene, onError = () => {}, onAfterRender = () => {}, onContrast }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  } catch (error) {
    onError(error.message || String(error));
    return { destroy() {}, renderOnce() {} };
  }
  canvas.dataset.renderer = 'three-webgl';
  delete canvas.dataset.gpuMs; // Retire any temporary diagnostic sample on hot reload.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.03;
  renderer.shadowMap.enabled = true;
  renderer.localClippingEnabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.transmissionResolutionScale = 0.68;
  const scrollEdge = createScrollEdge(renderer);
  const contrastSampler = createContrastSampler(renderer, onContrast);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf6f7f8);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 3000);
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const projected = new THREE.Vector3();
  const environment = makeEnvironment(renderer);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.9;
  const paper = seededNoiseTexture();
  const fields = [makeFluxField(), makeFluxField(), makeFluxField(), makeFluxField()];
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff, map: paper.color, bumpMap: paper.relief, bumpScale: 0.36,
    roughness: 0.91, metalness: 0, envMapIntensity: 0.18,
  });
  const floorUniforms = installFloorFlux(floorMaterial, fields);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), floorMaterial);
  floor.receiveShadow = true;
  floor.name = 'Textured white receiving surface';
  scene.add(floor);
  const ambient = new THREE.AmbientLight(0xf5f8ff, 0.30);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xfffefe, 3.1);
  key.position.copy(LIGHT_DIRECTION).multiplyScalar(-1550);
  key.castShadow = true;
  key.shadow.mapSize.set(1536, 1536);
  key.shadow.radius = 3.8;
  key.shadow.blurSamples = 8;
  key.shadow.bias = -0.0001;
  key.shadow.normalBias = 0.15;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = 3500;
  scene.add(key, key.target);
  // The movable source is an actual point light. Its colored analytic shadows
  // and bounded per-body photon sampling avoid six extra cube-shadow passes.
  const point = new THREE.PointLight(0xffffff, 0, 0, 2);
  scene.add(point);
  const lightReference = new THREE.Vector3();
  let lightPower = 1, lightDistanceSquared = 1;
  const illuminate = body => {
    if (point.visible) {
      body.lightDirection.subVectors(body.mesh.position, point.position).normalize();
      body.lightColor = point.color.toArray();
      body.lightPower = clamp(lightDistanceSquared / Math.max(1, body.mesh.position.distanceToSquared(point.position)), .35, 2.5);
    } else { body.lightDirection.copy(LIGHT_DIRECTION); body.lightColor = [1, 1, 1]; body.lightPower = 1; }
  };
  const fill = new THREE.DirectionalLight(0xe6f4ff, 0.18);
  fill.position.set(500, -100, 800);
  scene.add(fill);
  const bodies = fields.map((field, i) => makeJelly(scene, i, field, i === 3));
  const bubbles = [], surfaceSlots = [];
  const castGeometry = new THREE.PlaneGeometry(1, 1);
  const makeBubble = index => {
    const body = makeJelly(scene, index + 4, null, true);
    body.isBubble = true;
    body.capsule = false;
    body.mesh.name = `Shared jelly material ${index + 1}`;
    body.material.transparent = true; body.material.depthWrite = false;
    body.mesh.castShadow = false;
    body.clipPlanes = Array.from({ length: 4 }, () => new THREE.Plane(new THREE.Vector3(1, 0, 0), 100000));
    body.material.clippingPlanes = body.clipPlanes;
    // Attached controls use quiet contact on the reading film. Free surfaces
    // retain their transmitted-light footprint and moving pigment field.
    const castMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false });
    body.castUniforms = { size: { value: new THREE.Vector2() }, radius: { value: 1 }, pigment: { value: new THREE.Color() }, density: { value: .1 }, light: { value: 1 }, contact: { value: 0 } };
    castMaterial.onBeforeCompile = shader => {
      const flow = body.material.userData.flow;
      Object.assign(shader.uniforms, { uCastSize: body.castUniforms.size, uCastRadius: body.castUniforms.radius, uCastPigment: body.castUniforms.pigment, uCastDensity: body.castUniforms.density, uCastLight: body.castUniforms.light, uCastContact: body.castUniforms.contact,
        uPigmentRegion: flow.region, uActivityShape: flow.activity, uActivityGather: flow.gather, uActivityStrain: flow.strain, uActivityReading: flow.reading, uPocketDepth: flow.depth, uPigmentStrength: flow.strength, uPigmentPalette: flow.palette, uActivityPalette: flow.activityPalette, uActivityPigmentPhase: flow.pigmentPhase, uActivityFallbackDense: flow.fallbackDense });
      shader.vertexShader = 'varying vec2 vCastUv;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvCastUv = uv;');
      shader.fragmentShader = 'varying vec2 vCastUv; uniform vec2 uCastSize; uniform float uCastRadius; uniform vec3 uCastPigment; uniform float uCastDensity; uniform float uCastLight; uniform float uCastContact; uniform vec4 uPigmentRegion; uniform vec4 uActivityShape; uniform float uActivityGather; uniform float uPigmentStrength; uniform sampler2D uPigmentPalette;\n' + POCKET_GLSL + ACTIVITY_GLSL + ACTIVITY_PIGMENT_GLSL + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
        vec2 p = (vCastUv - .5) * (uCastSize + 24.0);
        vec2 q = abs(p) - max(vec2(0.0), uCastSize * .5 - uCastRadius);
        float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uCastRadius;
        float edge = exp(-pow((d - 1.8) / 4.8, 2.0));
        float bodyCast = (1.0 - smoothstep(-4.0, 7.0, d)) * .28;
        float focused = exp(-pow((d - 3.8) / 1.3, 2.0));
        vec3 pigment = uCastPigment;
        if (uPigmentStrength > .001) {
          vec2 pocketPoint = p - vec2(2.0, -3.0);
          vec4 pocket = uActivityShape.w > .001 ? jellyActivity(pocketPoint, uActivityShape, uActivityGather) : jellyPocket(pocketPoint, uPigmentRegion);
          float concentration = pocket.w * clamp(uPigmentStrength, 0.0, 1.0);
          // Light gathering on the receiving film follows the same moving lens.
          float pocketEdge = 4.0 * pocket.w * (1.0 - pocket.w);
          bodyCast += pocket.z * .20;
          focused += pocketEdge * .18;
          if (uActivityShape.w > .001) {
            pigment = jellyActivityPigment(pigment, concentration);
          } else pigment = texture2D(uPigmentPalette, vec2((concentration * 32.0 + .5) / 33.0, .5)).rgb;
        }
        diffuseColor.rgb = mix(pigment, vec3(1.0), focused * .7);
        if (uCastContact > .5) {
          // A soft filled footprint, without a second bright perimeter.
          // Ambient contact survives light-off; colored transmission does not.
          diffuseColor.rgb = mix(vec3(.15, .24, .28), pigment, .32 * uCastLight);
          diffuseColor.a *= (1.0 - smoothstep(-2.0, 3.0, d)) * uCastDensity * (.45 + .55 * uCastLight);
        } else {
          diffuseColor.a *= (edge + bodyCast) * uCastDensity * uCastLight;
        }
      `);
    };
    castMaterial.clippingPlanes = body.clipPlanes;
    body.cast = new THREE.Mesh(castGeometry, castMaterial); body.cast.frustumCulled = false;
    scene.add(body.cast);
    return body;
  };
  const clipRight = new THREE.Vector3(), clipUp = new THREE.Vector3();
  const applySurfaceClip = (body, rect, width, height) => {
    const clip = rect || { x: -10000, y: -10000, width: 20000, height: 20000 };
    clipRight.setFromMatrixColumn(camera.matrixWorld, 0); clipUp.setFromMatrixColumn(camera.matrixWorld, 1);
    body.clipPlanes[0].setFromNormalAndCoplanarPoint(clipRight, atScreen(clip.x, clip.y, body.centerZ, width, height));
    body.clipPlanes[1].setFromNormalAndCoplanarPoint(clipRight.clone().negate(), atScreen(clip.x + clip.width, clip.y, body.centerZ, width, height));
    body.clipPlanes[2].setFromNormalAndCoplanarPoint(clipUp, atScreen(clip.x, clip.y + clip.height, body.centerZ, width, height));
    body.clipPlanes[3].setFromNormalAndCoplanarPoint(clipUp.clone().negate(), atScreen(clip.x, clip.y, body.centerZ, width, height));
  };
  const selectionSlots = Array.from({ length: 2 }, (_, index) => makeSelectionRim(scene, index + 1));
  const targetTint = new THREE.Color();
  let destroyed = false, failed = false, frame = 0;
  let previous = performance.now(), lastPhoton = -1000, time = 0;
  let dimensions = [0, 0, 0];
  let lastSceneKey = '', lastPanelSceneKey = '', lastLightKey = '';
  let lastPanelPhoton = -1000;
  let cpuSamples = 0, cpuTotal = 0, cpuGeometry = 0, cpuFlux = 0, cpuScene = 0;


  let frameTimes = [];
  let cpuButtonFlux = 0, cpuPanelFlux = 0, panelPhotonCount = 0, buttonPhotonCount = 0;

  function atScreen(x, y, z, width, height) {
    raycaster.setFromCamera(new THREE.Vector2(x / width * 2 - 1, 1 - y / height * 2), camera);
    groundPlane.constant = -z;
    raycaster.ray.intersectPlane(groundPlane, projected);
    return projected;
  }

  function renderOnce(timestamp = performance.now()) {
    if (destroyed || failed || document.hidden) return;
    try {
      const cpuStart = performance.now();
      const state = getScene();
      if (!state) return;
      const sceneEnd = performance.now();
      if (import.meta.env.DEV) frameTimes.push(timestamp - previous);
      const delta = Math.min(0.055, Math.max(0.001, (timestamp - previous) / 1000));
      previous = timestamp;
      const width = Math.max(1, state.width || innerWidth);
      const height = Math.max(1, state.height || innerHeight);
      const mobile = width < 700;
      const params = state.params || {};
      const motion = clamp(params.motion ?? DEFAULT_MATERIAL.motion);
      const clarity = clamp(params.transmission ?? DEFAULT_MATERIAL.transmission);
      const illumination = clamp(params.light ?? DEFAULT_MATERIAL.light);
      const moving = !state.reducedMotion && motion > 0;
      if (moving) time += delta;
      const parallax = moving ? state.parallax || {} : {};
      const dpr = Math.min(state.dpr || devicePixelRatio || 1, mobile ? 1.3 : 1.5, Math.sqrt(2200000 / (width * height)));
      if (dimensions[0] !== width || dimensions[1] !== height || dimensions[2] !== dpr) {
        renderer.setPixelRatio(dpr);
        renderer.setSize(width, height, false);
        camera.left = -width / 2; camera.right = width / 2;
        camera.top = height / 2; camera.bottom = -height / 2;
        camera.updateProjectionMatrix();
        floor.scale.set(width * 4, height * 4, 1);
        paper.color.repeat.set(width * 4 / 256, height * 4 / 256);
        paper.relief.repeat.copy(paper.color.repeat);
        key.shadow.camera.left = -width * 0.9;
        key.shadow.camera.right = width * 0.9;
        key.shadow.camera.top = height * 1.2;
        key.shadow.camera.bottom = -height * 1.2;
        key.shadow.camera.updateProjectionMatrix();
        dimensions = [width, height, dpr];
        lastPhoton = -1000;
      }
      camera.position.set(clamp(parallax.x || 0, -1, 1) * 150, -clamp(parallax.y || 0, -1, 1) * 110, 1100);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      // Keep paper grain in document space across viewport-canvas rebases.
      paper.color.offset.y = paper.relief.offset.y = -(state.documentTop ?? 0) / 256;
      // Compensate the lower incidence angle to retain a luminous white floor.
      // Less neutral fill makes the blocked beam's colored replacement visible.
      const lighting = state.light;
      const basePower = lerp(2.35, 3.55, illumination) * 1.4;
      point.visible = Boolean(lighting);
      key.castShadow = !lighting;
      if (lighting) {
        const targets = (state.buttons || []).filter(Boolean);
        const centerX = state.lightAnchor?.x ?? (targets.length ? targets.reduce((sum, r) => sum + r.x + r.width / 2, 0) / targets.length : width / 2);
        const centerY = state.lightAnchor?.y ?? (targets.length ? targets.reduce((sum, r) => sum + r.y + r.height / 2, 0) / targets.length : height / 2);
        lightReference.copy(atScreen(centerX, centerY, 0, width, height));
        point.position.copy(atScreen(lighting.x, lighting.y, 0, width, height));
        point.position.z = clamp(lighting.height ?? 280, 120, 700);
        lightDistanceSquared = point.position.distanceToSquared(lightReference);
        lightPower = lighting.enabled === false ? 0 : clamp(lighting.intensity ?? 1, .2, 1.6) * basePower;
        point.intensity = lightPower * lightDistanceSquared;
        point.color.setRGB(...lightTemperature(lighting.warmth ?? .5), THREE.SRGBColorSpace);
        key.intensity = 0;
        floorUniforms.uNeutralBounce.value = 0;
        floorUniforms.uShadowStrength.value = lighting.enabled === false ? 0 : clamp(lighting.intensity ?? 1, 0, 1);
        floorUniforms.uShadowSoftness.value = clamp(lighting.softness ?? .45);
      } else {
        lightPower = key.intensity = basePower;
        floorUniforms.uNeutralBounce.value = key.intensity * -LIGHT_DIRECTION.z / Math.PI * .48;
        floorUniforms.uShadowStrength.value = 1;
        floorUniforms.uShadowSoftness.value = .45;
      }
      floorUniforms.uFluxStrength.value = .52;
      const buttonStates = [state.buttons?.[0], state.buttons?.[1], state.buttons?.[2], state.panel || null];
      const readingTargets = new Map((state.contrastTargets || []).map(target => [target.id, target]));
      const attachedReading = readingTargets.get(`primary-${state.buttons?.findIndex(button => button?.tabbed)}`);
      const smooth = 1 - Math.exp(-delta / (state.reducedMotion ? 0.07 : MOTION.feedback / 1000));
      bodies.forEach((body, index) => {
        let button = buttonStates[index];
        const wasLive = body.live && (!body.panel || body.owner === button?.id);
        if (body.panel) {
          body.owner = button?.id;
          if (!wasLive) { body.densityPrevious = null; body.densityPigment = null; }
        }
        body.live = !!button && button.width > 0 && button.height > 0;
        body.mesh.visible = body.live;
        if (!body.live) {
          body.field.shadowGeom.w = 0;
          if (wasLive) {
            body.field.accumulation.fill(0);
            uploadFlux(body.field);
          }
          return;
        }
        const window = body.panel ? windowPresentation({ depth: state.reducedMotion ? 1 : button.windowDepth ?? 1 }) : null;
        if (body.panel) {
          body.window = window;
          const target = button;
          if (!body.windowBounds || !wasLive || state.reducedMotion || target.boundsSampled) body.windowBounds = { x: target.x, y: target.y, width: target.width, height: target.height };
          const shapeEase = target.boundsSampled ? 1 : 1 - Math.exp(-delta / (MOTION.follow / 2200));
          body.windowBounds.x = target.x; body.windowBounds.y = target.y;
          for (const key of ['width', 'height']) body.windowBounds[key] = lerp(body.windowBounds[key], target[key], shapeEase);
          button = { ...button, ...body.windowBounds, color: target.color, cornerRadius: target.cornerRadius };
          if (target.tab) {
            if (!wasLive) body.responses = { ...body.responses, attachment: { value: 0, from: 0, target: 0, elapsed: 0 } };
            const attachment = clamp(stepJellyResponse(body, 'attachment', target.tab.engaged ? 1 : 0, delta,
              { duration: target.tab.engaged ? MOTION.expand : MOTION.collapse, curve: MOTION.spring, instant: !!state.reducedMotion }));
            const amount = target.tab.attachment ?? (attachment * clamp(window.depth));
            body.tab = { width: Math.min(target.tab.width, button.width * .7), lift: target.tab.lift * amount, amount, neck: target.tab.neck };
          } else body.tab = null;
        }
        // A spreading volume thins early; it must not become a dense rectangular slab.
        const openness = body.panel ? 1 - (1 - clamp(button.morph?.openness ?? 1)) ** 3 : 0;
        if (body.panel) body.fullness = lerp(1, volumeFullness('window'), openness);
        body.hover = lerp(body.hover, clamp(Math.max(button.hover || 0, (button.assistStrength || 0) * .4)), smooth);
        body.pressed = lerp(body.pressed, clamp(button.pressed || 0), 1 - Math.exp(-delta / (MOTION.compress / 1000)));
        body.stir = clamp(button.stir || 0);
        body.joinStrain = clamp(button.neckStrain || 0);
        const shapeEase = !wasLive || state.reducedMotion || button.transferring ? 1 : 1 - Math.exp(-delta / .065);
        if (!body.panel) {
          body.width = lerp(body.width, button.width, shapeEase);
          body.height = lerp(body.height, button.height, shapeEase);
          button = { ...button, x: button.x + (button.width - body.width) / 2, y: button.y + (button.height - body.height) / 2, width: body.width, height: body.height };
        } else { body.width = button.width; body.height = button.height; }
        body.docked = lerp(body.docked || 0, button.docked ? 1 : 0, state.reducedMotion ? 1 : smooth);
        if (!body.panel) {
          const arrival = state.reducedMotion ? 1 : clamp(button.arrival ?? 1);
          body.merge = primaryTabMerge(button, state.panel);
          body.arrival = arrival;
          body.material.opacity = (1 - body.merge) * arrival;
          body.material.depthWrite = body.merge < .01 && arrival >= .999;
          body.mesh.visible = body.live && body.merge < .997 && arrival > .001;
          body.mesh.castShadow = arrival >= .999;
        }
        body.field.strength.value = body.panel ? 1 : (1 - body.docked) * (1 - (body.merge || 0)) * body.arrival;
        const targetRadius = body.panel ? Math.min(button.cornerRadius ?? 30, button.width / 2, button.height / 2) : button.height / 2;
        body.r = body.panel && wasLive && !button.boundsSampled ? lerp(body.r, targetRadius, 1 - Math.exp(-delta / (MOTION.feedback / 1000))) : targetRadius;
        updateReadingFilm(body.material, index === 3 ? attachedReading : readingTargets.get(`primary-${index}`), body, index === 3 && wasLive);
        body.h = Math.max(0, button.width / 2 - body.r);
        body.hY = body.panel ? Math.max(0, button.height / 2 - body.r) : 0;
        const phase = time * Math.PI * 2 / (MOTION.breathe / 1000) + index * Math.PI * 2 / 3;
        const rest = moving ? 1 - body.hover : 0;
        body.breath = Math.sin(phase) * rest * (body.panel ? 0.001 : 0.007);
        body.scaleXY = body.panel ? 1 : 1 + body.hover * .022 + body.stir * .015 + body.breath;
        const targetDepth = (body.panel ? lerp((button.morph?.pillHeight ?? button.height) * .19 * clamp(params.depth ?? 1, .65, 1.5), JELLY_MATERIAL.window.rimHalfDepth * window.rimScale, openness) : button.height * 0.19 * clamp(params.depth ?? 1, .65, 1.5)) * (1 + body.hover * 0.13 + body.stir * 0.10 - body.pressed * 0.12 + Math.cos(phase) * rest * 0.011);
        body.c = targetDepth;
        const gap = body.panel ? lerp(clamp(params.lift ?? 12, 2, 40) + (button.morph?.closing ? 0 : 16), JELLY_MATERIAL.window.gap * window.gapScale, openness) : clamp(params.lift ?? 12, 2, 40) + body.hover * 16.0 + body.stir * 4.5 - body.pressed * 3.0;
        const headerFilm = JELLY_MATERIAL.window.gap + JELLY_MATERIAL.window.rimHalfDepth + JELLY_MATERIAL.window.filmHalfDepth + 1;
        body.centerZ = (body.panel ? gap : lerp(gap, headerFilm, body.docked)) + body.c;
        if (!body.panel) body.centerZ += 4 * (1 - body.arrival);
        if (!body.panel) body.centerZ = lerp(body.centerZ, JELLY_MATERIAL.window.gap + JELLY_MATERIAL.window.rimHalfDepth, body.merge || 0);
        const attraction = stepAttraction(body, (button.assistStrength || 0) > 0, delta, { disabled: !!state.reducedMotion || !moving || !!state.assistanceBlocked });
        const assistX = stepJellyResponse(body, 'assistX', (button.assistX || 0) * attraction, delta, { duration: MOTION.follow, curve: MOTION.settle, instant: !!state.reducedMotion || !moving || !!state.assistanceBlocked });
        const assistY = stepJellyResponse(body, 'assistY', (button.assistY || 0) * attraction, delta, { duration: MOTION.follow, curve: MOTION.settle, instant: !!state.reducedMotion || !moving || !!state.assistanceBlocked });
        body.mesh.position.copy(atScreen(button.x + button.width / 2 + assistX, button.y + button.height / 2 + assistY, body.centerZ, width, height));
        body.mesh.position.z = body.centerZ;
        illuminate(body);
        body.lightSoftness = lighting?.softness ?? .45;
        if (!body.panel) body.material.dispersion = clamp(params.prism ?? .025, 0, .08);
        body.time = moving ? time : 0;
        body.waveAmplitude = moving ? (body.panel ? 0.5 * window.depth : 0.35 + body.hover * 2.6 + body.stir * 2.5) * (0.45 + motion * 0.70) : 0;
        if (state.pointer?.visible && body.hover > 0.01) {
          const pointer = atScreen(state.pointer.x, state.pointer.y, body.centerZ + body.c, width, height);
          body.pointerX = pointer.x - body.mesh.position.x;
          body.pointerY = pointer.y - body.mesh.position.y;
        } else { body.pointerX = body.pointerY = 10000; }
        const pigment = button.color || [0.01, 0.23, 0.98];
        targetTint.copy(colorFrom(body.panel ? windowPigment(pigment) : pigment));
        const materialEase = body.panel && wasLive && !button.boundsSampled ? 1 - Math.exp(-delta / (MOTION.material / 1000)) : 1;
        setMaterialTone(body, targetTint, delta, !wasLive || !!state.reducedMotion || !!button.colorSampled);
        body.material.attenuationDistance = lerp(body.material.attenuationDistance, body.panel ? lerp(lerp(9, 18, openness), 37, clarity) * window.attenuationScale : lerp(9, 37, clarity), materialEase);
        body.material.roughness = lerp(body.material.roughness, lerp(0.095, 0.035, clarity) + (window ? (1 - window.density) * .05 : 0), materialEase);
        const density = body.material.userData.density, region = button.density;
        if (body.panel && region) {
          const phase = clamp(region.phase ?? (region.open ? 1 : 0));
          const velocity = Number.isFinite(body.densityPrevious) ? clamp((phase - body.densityPrevious) / Math.max(.001, delta) * .22, -1, 1) : 0;
          body.densityFlow = state.reducedMotion ? 0 : lerp(body.densityFlow || 0, velocity, 1 - Math.exp(-delta / .035));
          if (Math.abs(body.densityFlow) < .0001) body.densityFlow = 0;
          body.densityPrevious = phase;
          const field = densityPresentation(phase, body.densityFlow);
          body.densitySettle = stepDensitySettle(body.densitySettle, phase, delta, !!state.reducedMotion || !wasLive || !region.folder || body.densityFolder !== !!region.folder);
          body.densityFolder = !!region.folder;
          // Pausing ambient movement keeps a static color acknowledgment for
          // deliberate pointer/focus input; only the circulating strain stops.
          const hoverGain = stepJellyResponse(body, 'densityHover', region.hover ? 1 : 0, delta, { duration: MOTION.material, curve: MOTION.settle, instant: !!state.reducedMotion || !wasLive });
          const hover = densityHoverResponse(hoverGain, time, moving);
          const concentration = stepJellyResponse(body, 'densityConcentration', clamp(region.concentration ?? 1, .3, 1), delta, { duration: MOTION.material, curve: MOTION.gather, instant: !!state.reducedMotion || !wasLive });
          const visibility = region.opacity * (body.window?.contentOpacity ?? 1) * openness;
          const densityHeight = region.expandedHeight ?? region.height;
          body.density = { x: region.x + region.width / 2 - button.x - button.width / 2,
            y: button.y + button.height / 2 - region.y - densityHeight / 2,
            width: region.width + (region.folder ? 0 : Math.abs(field.flow) * 10), height: densityHeight, edge: field.edge, fold: region.folder ? field.fold : 0, folder: !!region.folder, jiggle: (body.densitySettle.strain + hover.jiggle) * visibility, flow: field.flow * visibility, amount: (field.amount + hover.amount) * visibility * concentration };
          density.body.value.set(body.width, body.height, body.r);
          density.region.value.set(body.density.x, body.density.y, body.density.width, body.density.height);
          density.amount.value = body.density.amount;
          density.jiggle.value = body.density.jiggle;
          density.shape.value.set(body.density.edge, body.density.flow, body.density.fold, body.density.folder ? 1 : 0);
          const pixels = density.palette.value.image.data;
          const basePixels = body.densityBasePixels ||= new Float32Array(pixels);
          if (body.densityPigment !== region.pigment) {
            body.densityFrom = new Float32Array(basePixels);
            body.densityTarget = new Float32Array(pixels.length);
            const origin = new THREE.Color(region.pigment).toArray();
            const palette = createJellyPalette(region.pigment, '#bfdfee');
            palette.colors.forEach((hex, i) => body.densityTarget.set([...densityClearing(origin, new THREE.Color(hex).toArray()), 0], i * 4));
            body.densityElapsed = body.densityPigment && wasLive ? 0 : MOTION.pigment;
            body.densityPigment = region.pigment;
            body.densityPaletteDirty = true;
          }
          // Only the local density correction follows this clock. The parent
          // keeps its already-sampled Spectral pigment without a second lag.
          let paletteChanged = false;
          if (body.densityElapsed < MOTION.pigment || body.densityPaletteDirty) {
            body.densityElapsed = state.reducedMotion ? MOTION.pigment : Math.min(MOTION.pigment, body.densityElapsed + delta * 1000);
            const mix = sampleBezier(MOTION.pigmentCurve, body.densityElapsed / MOTION.pigment);
            for (let i = 0; i < pixels.length; i++) basePixels[i] = lerp(body.densityFrom[i], body.densityTarget[i], mix);
            body.densityPaletteDirty = false;
            paletteChanged = true;
          }
          if (paletteChanged || body.densityHoverPigment !== hoverGain) {
            const sample = clamp(hoverGain) * 32, lower = Math.floor(sample), upper = Math.min(32, lower + 1);
            for (let i = 0; i < pixels.length; i++) {
              const channel = i % 4;
              const tint = channel < 3 ? lerp(DENSITY_HOVER_PIGMENT[lower][channel], DENSITY_HOVER_PIGMENT[upper][channel], sample - lower) - DENSITY_HOVER_PIGMENT[0][channel] : 0;
              pixels[i] = basePixels[i] + tint * Math.floor(i / 4) / 32;
            }
            body.densityHoverPigment = hoverGain;
            density.palette.value.needsUpdate = true;
          }
        } else { body.density = null; body.densityPrevious = null; body.densityFlow = 0; body.densitySettle = null; density.amount.value = 0; density.jiggle.value = 0; }
        body.material.thickness = body.c * 2;
        body.depth.opacity = 1;
        if (body.mesh.visible) updateGeometry(body, timestamp, moving);
        body.field.shadowIncident.copy(body.lightDirection);
        body.field.shadowGeom.set(body.mesh.position.x, body.mesh.position.y, body.centerZ, body.r * body.scaleXY);
        body.field.shadowShape.set(body.h * body.scaleXY, body.c, body.material.attenuationDistance, body.height / 2);
        body.field.shadowBox.set(body.h * body.scaleXY, body.hY * body.scaleXY);
        body.field.shadowTab.set(body.tab?.width || 0, body.tab?.lift || 0, body.tab?.amount || 0);
        body.field.shadowNeck.set(body.tab?.neck?.pull || 0, body.tab?.neck?.pinch || 0, body.tab?.neck?.wobble || 0);
        body.field.shadowFullness.value = body.panel ? 1 - openness : 0;
        body.field.shadowTint.copy(body.material.attenuationColor);
        body.field.shadowFlow.set(body.waveAmplitude, body.time, body.hover, body.stir);
        body.field.shadowPointer.set(body.pointerX, body.pointerY);
        const spectralTravel = body.c * 2 * body.material.dispersion / body.material.ior;
        body.field.spectralShift.set(-body.lightDirection.x / body.lightDirection.z * spectralTravel,
                                    -body.lightDirection.y / body.lightDirection.z * spectralTravel);
      });
      const parent = bodies[3];
      const lensStates = (state.bubbles || []).slice(0, OPTICAL_SURFACE_LIMIT).map((item, index) => ({ ...item, id: item.id ?? `legacy-${index}` }));
      const assigned = assignSurfaceSlots(surfaceSlots, lensStates);
      floorUniforms.uReadingDensityAmount.value = parent.live && parent.density ? parent.density.amount : 0;
      floorUniforms.uReadingDensityJiggle.value = parent.live && parent.density ? parent.density.jiggle : 0;
      if (parent.live && parent.density) {
        floorUniforms.uReadingDensityRegion.value.set(parent.mesh.position.x + parent.density.x, parent.mesh.position.y + parent.density.y, parent.density.width, parent.density.height);
        floorUniforms.uReadingDensityShape.value.set(parent.density.edge, parent.density.flow, parent.density.fold, parent.density.folder ? 1 : 0);
      }
      const liveSlots = new Set(assigned.map(entry => entry.index)), materialReactive = new Set();
      bubbles.forEach((body, index) => { if (!liveSlots.has(index)) { body.live = false; body.mesh.visible = false; body.cast.visible = false; } });
      assigned.forEach(({ item: bubble, index, fresh }) => {
        const body = bubbles[index] ||= makeBubble(index);
        const wasLive = body.live && !fresh;
        if (fresh) { body.hover = body.pressed = body.selection = 0; body.profileCacheKey = body.geometryKey = null; body.responses = {}; body.attraction = null; body.pocket = null; body.activityState = body.activityShape = body.activityPigment = null; }
        const role = SURFACE_ROLES[bubble.kind] || SURFACE_ROLES.control;
        body.kind = bubble.kind || 'control';
        body.headerControl = Boolean(bubble.headerControl);
        body.grouped = !!bubble?.grouped;
        body.bulb = !!bubble.bulb;
        body.live = (bubble.attached === false || parent.live) && !!bubble && bubble.width > 0 && bubble.height > 0 && (bubble.opacity ?? 1) > 0.001;
        body.mesh.visible = body.live; body.cast.visible = body.live;
        if (!body.live) return;
        const materialEase = 1 - Math.exp(-delta / (MOTION.material / 1000));
        // Pausing continuous breathing must not erase deliberate control feedback.
        const instant = !wasLive || !!state.reducedMotion;
        body.activityState = bubble.activity || body.activityState ? stepActivity(body.activityState, bubble.activity, bubble.activityPhase, delta, { instant, moving }) : null;
        const activityState = body.activityState;
        if (bubble.activity === 'loading' || activityState?.settling) materialReactive.add(bubble.id);
        body.activityShape = activityState?.energy > .0001 ? activityPocket(bubble.width, bubble.height, activityState.clock, activityState) : null;
        body.selection = body.grouped ? 0 : stepJellyResponse(body, 'selection', bubble.selected ? 1 : 0, delta, { instant });
        body.hover = stepJellyResponse(body, 'hover', clamp(Math.max(bubble.hover || 0, (bubble.assistStrength || 0) * .4)), delta, { instant, duration: MOTION.flow, curve: MOTION.spring });
        body.pressed = stepJellyResponse(body, 'press', clamp(bubble.pressed || 0), delta, { instant,
          duration: bubble.pressed ? MOTION.compress : MOTION.recoil, curve: bubble.pressed ? MOTION.squeeze : MOTION.recoilCurve });
        if (body.feedback !== bubble.feedback) { body.feedback = bubble.feedback; body.feedbackTime = time; }
        const feedbackAge = time - (body.feedbackTime ?? time);
        const acknowledgement = moving && bubble.feedback && feedbackAge < 1.1 ? Math.sin(feedbackAge / 1.1 * Math.PI) * Math.exp(-feedbackAge * 2) : 0;
        body.width = bubble.width; body.height = bubble.height;
        body.r = Math.min(bubble.cornerRadius ?? 22, bubble.width / 2, bubble.height / 2);
        updateReadingFilm(body.material, readingTargets.get(bubble.id), body);
        // Pills and badges are the very same closed capsule as the hero. Keep
        // the rounded rectangular reading body only where layout requires it.
        fitSurfaceGeometry(body, body.r >= bubble.height / 2 - .5 && bubble.width >= bubble.height && (!body.grouped || body.bulb));
        body.h = Math.max(0, bubble.width / 2 - body.r);
        body.hY = Math.max(0, bubble.height / 2 - body.r);
        const rest = moving && !body.grouped && !(activityState?.gather > .999) ? Math.sin(time * Math.PI * 2 / (MOTION.breathe / 1000) + index * .41) * .002 : 0;
        body.scaleXY = 1 + body.hover * 0.016 - body.pressed * .012 + rest;
        body.c = (body.grouped && !body.bulb ? JELLY_MATERIAL.control.filmHalfDepth + 1.1 : bubble.kind === 'menu' ? JELLY_MATERIAL.control.menuHalfDepth : Math.min(JELLY_MATERIAL.control.maxHalfDepth, Math.max(JELLY_MATERIAL.control.rimHalfDepth, bubble.height * JELLY_MATERIAL.control.heightDepthRatio)) * role.depth)
          * (['thumb', 'track', 'fill'].includes(bubble.kind) ? .74 + .26 * clamp(bubble.emphasis ?? 1, 0, 1.12) : 1)
          + acknowledgement * .65 + body.hover * (body.grouped && !body.bulb ? 0.42 : 1.1) + body.selection * JELLY_MATERIAL.control.selectedLift - body.pressed * (body.grouped ? 0.25 : 0.8) + (activityState?.density || 0) * 1.5;
        const localDensity = bubble.attached !== false && parent.density
          ? densityFieldProfile(bubble.x + bubble.width / 2 - parent.mesh.position.x - width / 2 - parent.density.x,
            height / 2 - bubble.y - bubble.height / 2 - parent.mesh.position.y - parent.density.y, parent.density).height : 0;
        body.centerZ = (bubble.attached === false ? 0 : parent.centerZ + JELLY_MATERIAL.window.filmHalfDepth + localDensity) + 1.0 + (bubble.layer ?? role.layer) * 4 + body.c;
        body.mesh.renderOrder = (bubble.layer ?? role.layer) * 2 + 2;
        applySurfaceClip(body, bubble.clip, width, height);
        const attraction = stepAttraction(body, (bubble.assistStrength || 0) > 0, delta, { disabled: !!state.reducedMotion || !moving || !!state.assistanceBlocked });
        const assistX = stepJellyResponse(body, 'assistX', (bubble.assistX || 0) * attraction, delta, { duration: MOTION.follow, curve: MOTION.settle, instant: instant || !moving || !!state.assistanceBlocked });
        const assistY = stepJellyResponse(body, 'assistY', (bubble.assistY || 0) * attraction, delta, { duration: MOTION.follow, curve: MOTION.settle, instant: instant || !moving || !!state.assistanceBlocked });
        body.mesh.position.copy(atScreen(bubble.x + bubble.width / 2 + assistX, bubble.y + bubble.height / 2 + assistY, body.centerZ, width, height));
        body.mesh.position.z = body.centerZ;
        illuminate(body);
        body.time = moving ? time + index * 0.41 : 0;
        body.waveAmplitude = moving && (!body.grouped || body.bulb && body.hover > .005) ? ((bubble.kind === 'row' || bubble.kind === 'table' ? .07 : .26) + body.hover * 1.6) * (.45 + motion * .70) * (1 - clamp(activityState?.gather || 0)) : 0;
        const pigmentKey = `${bubble.kind}:${bubble.color}:${Boolean(bubble.selected)}:${body.grouped}`;
        if (body.pigmentKey !== pigmentKey) {
          body.pigmentKey = pigmentKey;
          body.pigmentRGB = bubble.colorSampled && bubble.kind !== 'track' ? bubble.color : surfacePigment(bubble.color || [0.39, 0.72, 0.97], bubble.kind, bubble.selected, body.grouped);
        }
        targetTint.copy(colorFrom(body.pigmentRGB));
        setMaterialTone(body, targetTint, delta, !wasLive || !!state.reducedMotion || !!bubble.colorSampled);
        const flowUniforms = body.material.userData.flow;
        const activityGain = activityState?.energy || 0;
        const activity = body.activityShape;
        if (bubble.activity && bubble.activityColor) {
          const destination = bubble.activityColor;
          body.activityPigment = activityPigment(body.activityPigment, bubble.activity, destination, activityState.sample);
          const pigment = body.activityPigment;
          if (activity) activity.color = pigment.denseRGB;
          flowUniforms.pigmentPhase.value = pigment.sample;
          if (body.activityFilmPalette !== pigment.filmPalette || body.activityDensePalette !== pigment.palette) {
            body.activityFilmPalette = pigment.filmPalette; body.activityDensePalette = pigment.palette;
            const pixels = flowUniforms.activityPalette.value.image.data;
            for (const [row, path] of [pigment.filmPalette, pigment.palette].entries()) {
              path.colors.forEach((hex, i) => pixels.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], (row * 33 + i) * 4));
            }
            flowUniforms.activityPalette.value.needsUpdate = true;
          }
        } else {
          // Without an explicit destination, the host's displayed pigment is
          // authoritative. Its own sample needs no guessed Spectral retarget.
          flowUniforms.pigmentPhase.value = -1;
          if (bubble.activity === 'loading') flowUniforms.fallbackDense.value.set('#1459d1');
          else flowUniforms.fallbackDense.value.copy(targetTint);
          body.activityPigment = null;
          if (activity) activity.color = body.pigmentRGB;
        }
        flowUniforms.activity.value.set(activity?.width || 0, activity?.height || 0, activity?.phase || 0, activity?.breath || 0);
        flowUniforms.gather.value = activity?.gather || 0;
        flowUniforms.strain.value = activity?.strain || 0;
        flowUniforms.depth.value = activity ? ACTIVITY_VOLUME.depth : POCKET.depth;
        flowUniforms.reading.value.set(bubble.activity ? bubble.width : 0, bubble.activity ? bubble.height : 0);
        if (bubble.flow || activity) {
          const target = bubble.flow || activity;
          body.pocket = stepPocket(body.pocket, target, delta, instant);
          body.flow = { ...pocketShape(body.pocket), strength: (activity ? ACTIVITY_VOLUME.strength : JELLY_MATERIAL.control.focusPigmentStrength) * (bubble.flow ? 1 : activityGain) };
          flowUniforms.region.value.set(body.flow.x, body.flow.y, body.flow.width, body.flow.height);
          flowUniforms.strength.value = body.flow.strength;
          if (!activity) {
            const from = `#${targetTint.getHexString(THREE.SRGBColorSpace)}`;
            const to = `#${colorFrom(target.color).getHexString(THREE.SRGBColorSpace)}`;
            const paletteKey = `${from}:${to}`;
            if (body.flowPaletteKey !== paletteKey) {
              body.flowPaletteKey = paletteKey;
              const palette = createJellyPalette(from, to), pixels = flowUniforms.palette.value.image.data;
              palette.colors.forEach((hex, i) => pixels.set([parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16), 255], i * 4));
              flowUniforms.palette.value.needsUpdate = true;
            }
          }
        } else { body.flow = null; body.pocket = null; flowUniforms.strength.value = 0; }
        body.material.attenuationColor.multiplyScalar(1 - clamp(body.selection) * JELLY_MATERIAL.control.selectedTintAbsorption);
        const opticalDistance = lerp(JELLY_MATERIAL.control.attenuationDense, JELLY_MATERIAL.control.attenuationClear, clarity)
          * (body.grouped ? 1.6 : bubble.kind === 'menu' ? 1.35 : 1) / (1 + body.selection * JELLY_MATERIAL.control.selectedDensity + (activityState?.density || 0) * .12);
        body.material.attenuationDistance = activityState ? opticalDistance : lerp(body.material.attenuationDistance, opticalDistance, materialEase);
        const roughness = lerp(0.065, 0.035, clarity) + (activityState ? Math.max(0, activityState.density) * .018 : 0);
        body.material.roughness = activityState ? roughness : lerp(body.material.roughness, roughness, materialEase);
        body.material.opacity = clamp(bubble.opacity ?? 1) * (bubble.attached === false ? 1 : parent.window?.contentOpacity ?? 1);
        body.material.thickness = body.c * 2;
        updateGeometry(body, timestamp, moving && (!body.grouped || body.hover > 0.005) && (!activityState || activityState.settling || activityState.gather < .999));
        const attached = bubble.attached !== false;
        const contact = attached || bubble.contact === true;
        const elevation = contact ? .65 + clamp(body.hover) * .35 - clamp(body.pressed) * .25 : 2 + body.c * .65 + body.hover * 3;
        let castX = -body.lightDirection.x / body.lightDirection.z * elevation;
        let castY = body.lightDirection.y / body.lightDirection.z * elevation;
        if (contact) {
          const limit = Math.min(1, JELLY_MATERIAL.contact.maxOffset / Math.max(.001, Math.hypot(castX, castY)));
          castX *= limit; castY *= limit;
        }
        body.cast.position.copy(atScreen(bubble.x + bubble.width / 2 + castX, bubble.y + bubble.height / 2 + castY, body.centerZ - body.c - .2, width, height));
        const contour = activity ? activityContour(activity) : { inset: 0, bulge: 0 };
        const castWidth = bubble.width - contour.inset * 2, castHeight = bubble.height + contour.bulge * 2;
        body.cast.scale.set(castWidth + 24, castHeight + 24, 1);
        body.cast.renderOrder = (bubble.layer ?? role.layer) * 2 + 1;
        body.cast.material.opacity = body.material.opacity;
        body.castUniforms.size.value.set(castWidth, castHeight);
        body.castUniforms.radius.value = body.r;
        body.castUniforms.pigment.value.copy(body.toneColor);
        body.castUniforms.contact.value = contact ? 1 : 0;
        body.castUniforms.density.value = contact
          ? body.kind === 'track' || body.kind === 'fill' ? 0 : body.kind === 'thumb' ? JELLY_MATERIAL.contact.thumbDensity : body.grouped ? JELLY_MATERIAL.contact.groupedDensity : JELLY_MATERIAL.contact.density
          : Math.min(.15, .04 + body.c / body.material.attenuationDistance * .15);
        body.castUniforms.light.value = contact ? floorUniforms.uShadowStrength.value : .7 + illumination * .3;
        // A zero-density receiver contributes no pixels. Do not submit its
        // transparent quad (tracks and fills otherwise cost two extra draws each).
        body.cast.visible = body.castUniforms.density.value > 0 && body.material.opacity > .001;
      });
      const selectionInputs = (state.selections || []).slice(0, 2).filter(group => group && group.width > 0 && group.height > 0);
      const groupIds = selectionInputs.map(group => String(group.id));
      const occupied = new Set();
      const wasVisible = selectionSlots.map(slot => slot.active);
      selectionSlots.forEach(slot => { slot.active = false; slot.body.live = false; slot.body.mesh.visible = false; });
      selectionInputs.filter(group => parent.live || group.attached === false).forEach(group => {
        const id = String(group.id);
        let slot = selectionSlots.find(candidate => candidate.id === id && !occupied.has(candidate));
        if (!slot) slot = selectionSlots.find(candidate => !occupied.has(candidate) && !groupIds.includes(candidate.id));
        if (!slot) return;
        occupied.add(slot);
        const first = !wasVisible[selectionSlots.indexOf(slot)] || slot.id !== id;
        const key = String(group.key ?? id);
        if (first || !slot.motion) slot.motion = createSelectionMotion(group, key);
        else retargetSelection(slot.motion, group, key, !!state.reducedMotion || !!group.instant);
        stepSelection(slot.motion, delta, !!state.reducedMotion || !!group.instant);
        slot.id = id;
        const contour = selectionContour(slot.motion), rect = contour.bounds, body = slot.body;
        slot.active = (group.opacity ?? 1) > 0.001;
        body.contour = contour; body.assimilationDepth = slot.motion.depth;
        body.live = slot.active && slot.motion.density > 0.00001; body.mesh.visible = body.live;
        body.width = rect.width; body.height = rect.height;
        body.r = Math.max(1, Math.min(rect.cornerRadius, rect.width / 2, rect.height / 2));
        body.h = Math.max(0, rect.width / 2 - body.r); body.hY = Math.max(0, rect.height / 2 - body.r);
        body.c = Math.max(0.20, (JELLY_MATERIAL.control.rimHalfDepth + JELLY_MATERIAL.control.selectedLift) * slot.motion.depth);
        const filmTop = (group.attached === false ? 0 : parent.centerZ + JELLY_MATERIAL.window.filmHalfDepth) + (group.layer ?? 0) * 4;
        body.centerZ = filmTop - 1.6 + slot.motion.depth * (JELLY_MATERIAL.control.rimHalfDepth + 1.8);
        body.mesh.position.copy(atScreen(rect.x + rect.width / 2, rect.y + rect.height / 2, body.centerZ, width, height));
        body.mesh.position.z = body.centerZ; body.time = moving ? time : 0;
        applySurfaceClip(body, group.clip, width, height);
        targetTint.copy(group.color ? colorFrom(group.color) : parent.toneGoal);
        const materialEase = first ? 1 : 1 - Math.exp(-delta / (MOTION.material / 1000));
        // Spectral transport hook: snapshot current base tint on interruption,
        // then sample a cached palette at the shared subsumption colorProgress.
        setMaterialTone(body, targetTint, delta, first || !!state.reducedMotion || !!group.instant, slot.motion.colorProgress);
        body.material.attenuationColor.multiplyScalar(1 - JELLY_MATERIAL.control.selectedTintAbsorption);
        const distance = lerp(JELLY_MATERIAL.control.attenuationDense, JELLY_MATERIAL.control.attenuationClear, clarity)
          / (1 + JELLY_MATERIAL.control.selectedDensity);
        body.material.attenuationDistance = lerp(body.material.attenuationDistance, distance, materialEase);
        body.material.roughness = lerp(body.material.roughness, lerp(0.095, 0.035, clarity), materialEase);
        body.mesh.renderOrder = (group.layer ?? 2) * 2 + 3;
        body.material.opacity = clamp(group.opacity ?? 1) * slot.motion.density * (group.attached === false ? 1 : parent.window?.contentOpacity ?? 1);
        body.material.thickness = body.c * 2;
        deformSelectionRim(body, timestamp, moving, slot.motion.travelling);
      });
      const geometryEnd = performance.now();
      bodies.forEach(body => { if (body.live) moveReceiverField(body.field, body.mesh.position); });
      const sceneKey = JSON.stringify([buttonStates.map(b => b && [b.x, b.y, b.width, b.height, b.hover, b.pressed, b.stir, b.color, b.cornerRadius]), parent.tab, parent.density, parent.densityElapsed,
        bodies.map(body => [Math.round(body.hover * 10000), Math.round(body.pressed * 10000),
          Math.round(body.centerZ * 10000), Math.round(body.c * 10000), Math.round(body.r * 10000),
          body.material.attenuationColor.toArray().map(c => Math.round(c * 10000)),
          Math.round(body.material.attenuationDistance * 10000), body.pointerX, body.pointerY]),
        clarity, illumination, parallax, lighting, params.depth, params.lift, params.prism]);
      const active = bodies.some(body => body.hover > 0.01 || body.stir > 0.01);
      const lightChanged = JSON.stringify(lighting) !== lastLightKey;
      const photonInterval = 1000 / (lightChanged ? (mobile ? 16 : 24) : mobile ? (active ? 14 : 8) : (active ? 18 : 10));
      if (timestamp - lastPhoton >= photonInterval && (moving || sceneKey !== lastSceneKey)) {
        const start = performance.now();
        bodies.slice(0, 3).forEach(body => { if (body.live && body.field.strength.value > .002) traceCaustics(body, mobile, lightPower); });
        cpuButtonFlux += performance.now() - start; buttonPhotonCount++;
        lastPhoton = timestamp;
        lastSceneKey = sceneKey; lastLightKey = JSON.stringify(lighting);
      }
      // The panel's live analytic receiver carries its shadow. A small bounded
      // photon field adds only restrained edge focusing, at no more than8Hz.
      if (parent.live && timestamp - lastPanelPhoton >= 125 && (moving || sceneKey !== lastPanelSceneKey)) {
        const start = performance.now();
        traceMeniscusCaustics(parent, mobile, lightPower);
        cpuPanelFlux += performance.now() - start; panelPhotonCount++;
        lastPanelPhoton = timestamp; lastPanelSceneKey = sceneKey;
      }
      const fluxEnd = performance.now();
      // Keep the document-attached overscan for stable projection, but shade
      // the visible pixels plus a 64px scroll guard. Scroll rebases repaint the new slice
      // on the next frame without lowering optical resolution.
      const visibleTop = clamp((state.viewportTop ?? 0) - 64, 0, height);
      const visibleBottom = clamp((state.viewportTop ?? 0) + (state.viewportHeight ?? height) + 64, visibleTop, height);
      renderer.setScissor(0, height - visibleBottom, width, visibleBottom - visibleTop);
      renderer.setScissorTest(true);
      renderer.render(scene, camera);
      contrastSampler.sample(state, timestamp, materialReactive);
      const edgeRendered = scrollEdge.render(state);
      if (import.meta.env.DEV) {
        canvas.dataset.scrollEdgePass = String(edgeRendered);
        canvas.dataset.scrollEdgeStrength = String(state.scrollEdge?.strength ?? 0);
        canvas.dataset.arrivals = bodies.slice(0, 3).map(body => (body.arrival ?? 1).toFixed(3)).join(',');
      }
      onAfterRender();
      canvas.dataset.bubblesReady = 'true';
      if (import.meta.env.DEV && lighting) {
        canvas.dataset.lightPosition = point.position.toArray().map(n => n.toFixed(1)).join(',');
        canvas.dataset.lightEnabled = String(lighting.enabled !== false);
        canvas.dataset.shadowOffsets = bodies.slice(0, 3).map(body => [-body.lightDirection.x / body.lightDirection.z * body.centerZ, body.lightDirection.y / body.lightDirection.z * body.centerZ].map(n => n.toFixed(1)).join(',')).join(';');
      }
      canvas.dataset.renderedSurfaces = String(lensStates.length);
      canvas.dataset.surfaceKinds = [...new Set(lensStates.map(item => item.kind || 'control'))].join(',');
      if (import.meta.env.DEV) {
        canvas.dataset.headerAttraction = [...bodies.slice(0, 3).filter(body => body.live && body.docked > .9), ...bubbles.filter(body => body.live && body.headerControl)].map(body => `${(body.attraction?.gain || 0).toFixed(2)}:${(body.responses?.assistX?.value || 0).toFixed(2)},${(body.responses?.assistY?.value || 0).toFixed(2)}`).join(';');
        canvas.dataset.magneticOffsets = bubbles.filter(body => body?.live && body.kind === 'thumb').map(body => `${(body.responses?.assistX?.value || 0).toFixed(2)},${(body.responses?.assistY?.value || 0).toFixed(2)}`).join(';');
        const flowing = bubbles.filter(body => body.live && body.flow);
        canvas.dataset.pigmentY = flowing.map(body => body.flow.y.toFixed(2)).join(',');
        canvas.dataset.pigmentTargetY = flowing.map(body => body.pocket.target.y.toFixed(2)).join(',');
        canvas.dataset.pocketStrain = flowing.map(body => body.pocket.strain.toFixed(4)).join(',');
        canvas.dataset.pigmentStrength = flowing.map(body => body.flow.strength.toFixed(3)).join(',');
        const visibleSelections = selectionSlots.filter(slot => slot.body.live);
        canvas.dataset.selectionX = visibleSelections.map(slot => selectionRect(slot.motion).x.toFixed(2)).join(',');
        canvas.dataset.selectionTargetX = visibleSelections.map(slot => (slot.motion.target.cx - slot.motion.target.width / 2).toFixed(2)).join(',');
        canvas.dataset.selectionTravel = visibleSelections.map(slot => slot.motion.travel.toFixed(4)).join(',');
        canvas.dataset.selectionStretch = visibleSelections.map(() => '0').join(',');
        canvas.dataset.selectionDepth = selectionSlots.filter(slot => slot.active).map(slot => slot.motion.depth.toFixed(4)).join(',');
        canvas.dataset.selectionPhase = selectionSlots.filter(slot => slot.active).map(slot => slot.motion.phase).join(',');
        canvas.dataset.windowDepth = String(parent.window?.depth ?? 1);
        canvas.dataset.densityPhase = String(parent.densityPrevious ?? 0);
        canvas.dataset.densityFlow = String(parent.density?.flow ?? 0);
        canvas.dataset.densityJiggle = String(parent.density?.jiggle ?? 0);
        canvas.dataset.densityCacheBuilds = String(parent.surfaceCacheBuilds || 0);
        canvas.dataset.tabAttachment = String(parent.tab?.amount ?? 0);
        canvas.dataset.tabNeck = [parent.tab?.neck?.pull || 0, parent.tab?.neck?.pinch || 0, parent.tab?.neck?.wobble || 0].map(v => v.toFixed(3)).join(',');
        canvas.dataset.tabMerged = bodies.slice(0, 3).map(body => (body.merge || 0).toFixed(3)).join(',');
        canvas.dataset.selectionDensity = selectionSlots.filter(slot => slot.active).map(slot => slot.motion.density.toFixed(4)).join(',');
        canvas.dataset.selectionMix = selectionSlots.filter(slot => slot.active).map(slot => slot.motion.colorProgress.toFixed(4)).join(',');
        cpuSamples++; cpuTotal += performance.now() - cpuStart;
        cpuScene += sceneEnd - cpuStart; cpuGeometry += geometryEnd - sceneEnd; cpuFlux += fluxEnd - geometryEnd;
        if (cpuSamples >= 30) {
          const intervals = frameTimes.filter(ms => ms > 0 && ms < 250);
          const sorted = [...intervals].sort((a, b) => a - b);
          canvas.dataset.frameMs = (intervals.reduce((sum, ms) => sum + ms, 0) / Math.max(intervals.length, 1)).toFixed(2);
          canvas.dataset.frameP95Ms = (sorted[Math.floor(sorted.length * .95)] || 0).toFixed(2);
          canvas.dataset.drawCalls = String(renderer.info.render.calls);
          frameTimes = [];
          canvas.dataset.renderCpuMs = (cpuTotal / cpuSamples).toFixed(2);
          canvas.dataset.sceneCpuMs = (cpuScene / cpuSamples).toFixed(2);
          canvas.dataset.geometryCpuMs = (cpuGeometry / cpuSamples).toFixed(2);
          canvas.dataset.fluxCpuMs = (cpuFlux / cpuSamples).toFixed(2);
          canvas.dataset.buttonFluxCpuMs = (cpuButtonFlux / cpuSamples).toFixed(2);
          canvas.dataset.panelFluxCpuMs = (cpuPanelFlux / cpuSamples).toFixed(2);
          canvas.dataset.buttonPhotonCallMs = (cpuButtonFlux / Math.max(buttonPhotonCount, 1)).toFixed(2);
          canvas.dataset.panelPhotonCallMs = (cpuPanelFlux / Math.max(panelPhotonCount, 1)).toFixed(2);
          canvas.dataset.breathPhase = time.toFixed(3);
          canvas.dataset.breathAmplitude = bodies.map(body => (body.breath || 0).toFixed(5)).join(',');
          canvas.dataset.fluxHz = String(Math.round(1000 / photonInterval));
          canvas.dataset.panelVisible = String(bodies[3].live);
          cpuSamples = cpuTotal = cpuGeometry = cpuFlux = cpuScene = 0;
          cpuButtonFlux = cpuPanelFlux = panelPhotonCount = buttonPhotonCount = 0;
        }
      }
    } catch (error) {
      failed = true;
      canvas.dataset.renderer = 'failed';
      onError(error.message || String(error));
    }
  }

  function animate(timestamp) {
    if (destroyed || failed) return;
    if (!document.hidden) renderOnce(timestamp);
    else previous = timestamp;
    frame = requestAnimationFrame(animate);
  }
  try { renderOnce(); frame = requestAnimationFrame(animate); }
  catch (error) { failed = true; onError(error.message || String(error)); }

  return {
    renderOnce,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      bubbles.forEach(body => body.cast.material.dispose()); castGeometry.dispose();
      bodies.concat(bubbles, selectionSlots.map(slot => slot.body)).forEach(body => { body.geometry.dispose(); body.material.userData.flow.palette.value.dispose(); body.material.userData.flow.activityPalette.value.dispose(); body.material.userData.density.palette.value.dispose(); body.material.dispose(); body.depth.dispose(); });
      floor.geometry.dispose(); floorMaterial.dispose();
      fields.forEach(field => field.texture.dispose());
      paper.color.dispose(); paper.relief.dispose();
      environment.dispose();
      scrollEdge.destroy();
      contrastSampler.destroy();
      key.shadow.map?.dispose(); key.shadow.mapPass?.dispose();
      renderer.dispose();
      delete canvas.dataset.renderer;
      delete canvas.dataset.bubblesReady;
      for (const name of ['lightPosition', 'lightEnabled', 'shadowOffsets', 'selectionX', 'selectionTargetX', 'selectionTravel', 'selectionStretch', 'selectionDepth', 'selectionPhase', 'selectionDensity', 'selectionMix', 'pigmentY', 'pigmentTargetY', 'pigmentStrength', 'pocketStrain', 'scrollEdgePass', 'scrollEdgeStrength', 'arrivals']) delete canvas.dataset[name];
    },
  };
}
