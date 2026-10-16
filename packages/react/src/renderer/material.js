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
    focusPigmentStrength: .86,
    attenuationDense: 9, attenuationClear: 37,
    selectedDensity: 0.22, selectedTintAbsorption: 0.08, selectedLift: 0.55,
  }),
});
