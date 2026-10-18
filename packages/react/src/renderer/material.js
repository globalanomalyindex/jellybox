// Jelly has a curved transmitting body and a denser supporting meniscus.
// Fullness is role-dependent so large reading surfaces remain steady.
// These are authored display-space proportions, not measured fluid properties.
export const DEFAULT_MATERIAL = Object.freeze({ motion: 0.48, transmission: 0.06, light: 0.25 });
export const JELLY_MATERIAL = Object.freeze({
  window: Object.freeze({
    filmHalfDepth: .85, rimHalfDepth: 11, rimSpan: 14, gap: 2,
    castStrength: .14, causticStrength: .28, externalCastTransmission: .1,
  }),
  // Controls sit on the reading film. Their contact cue must never become a
  // detached copy that can be mistaken for another thumb or selected border.
  contact: Object.freeze({ maxOffset: 2.5, density: .06, thumbDensity: .08, groupedDensity: .04 }),
  control: Object.freeze({
    filmHalfDepth: 1.65, rimHalfDepth: 6.2, rimSpan: 7,
    heightDepthRatio: .19, maxHalfDepth: 12, menuHalfDepth: 15, menuRimSpan: 12,
    // A broad concentration inside the compact body's silhouette. The film
    // keeps its exact pigment and the shoulder gains its depth by optical path.
    densityShoulder: Object.freeze({ minimumSpan: 3, maximumSpan: 7, relief: 1.5,
      rest: .45, hover: .20, selected: .25, maximum: .95, absorption: 1.2,
      smallControlPath: 10, smallControlFullSpan: 22, smallControlSpan: 40 }),
    focusPigmentStrength: .86,
    attenuationDense: 9, attenuationClear: 37,
    selectedDensity: 0.22, selectedTintAbsorption: 0.08, selectedLift: 0.55,
  }),
});

// Consume the owner's existing sampled state. This introduces no response clock
// or pigment solve; disabled controls retain the lamp-independent rest cue.
export function densityShoulderAmount({ hover = 0, selected = 0, disabled = false } = {}) {
  const { rest, hover: approach, selected: commitment, maximum } = JELLY_MATERIAL.control.densityShoulder;
  if (disabled) return rest;
  const bounded = value => Math.max(0, Math.min(1, typeof value === 'boolean' ? Number(value) : Number.isFinite(value) ? value : 0));
  return Math.min(maximum, rest + approach * bounded(hover) + commitment * bounded(selected));
}
