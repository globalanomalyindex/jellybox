# Design contract

## Purpose

A colorful, light-reactive interface that behaves as connected jelly. Its Macintosh/Frutiger Aero ancestry is vibrant and alive; changing density adds dynamic structure to the glass metaphor. The three tools are a proving ground for this wider system, not a claim of proven HCI benefits.

## Identity and composition

The supplied two-line black SVG is static and unshaded. Keep the opening logo, trio and broad credit/name block together in the first desktop viewport. The name aligns to the date's outer right edge. The story uses optional licensed Dessign Maison Regular, with an intentional system fallback in public builds. Control typography stays system sans. A simple gray editorial rule belongs to the story; jelly interiors use density instead of ledgers.

The story has a readable main column, persistent chapter index and a compact horizontal index. Native fragments and scroll position own chapter highlighting; document-end clamping still selects the final chapter. Working panels remain in document flow.

## Density and hierarchy

A quiet thin reading film and a concentrated perimeter belong to one parent. Inner groups are filled neutral clear-water concentrations with a narrow defined shoulder, broad crown and quieter receiver artifacts. No opaque inner white card, hollow glowing outline or residual pill over primary text.

Labels, icon cells, values and hit targets stay anchored. Selected rims, checks, explicit headings and task grouping establish hierarchy. Sliders keep label/value/short rail visible; their optical cross-section gathers on approach rather than moving endpoints.

## Color and state

Glass blue is the resting trio. Highlight invites interaction; a denser pigment expresses commitment. Save is green, Restore blue and Delete red. Focus/checks/words carry meaning as well as color. Palette preview never silently commits. Use shared semantic tones and Spectral color paths; do not start a second renderer interpolation.

## Motion and light

A pill stretches into its top-left tab and withdraws on close; an old tab sinks as a new one gathers. Inner folders stretch/pinch and settle with a small bounded wobble. Text never deforms. One initial hierarchy settles by 900 ms, without delaying input or repeating on every section. Shared lighting and density follow the same material handoff.

The movable bulb changes the material's highlights, transmitted casts and optical response. Effects support grouping; they cannot be the only source of state. The bottom progressive blur signals content below while yielding to the signature, focus, selected text and document end. It combines rendered pixels with native browser blur for HTML.

## Requirements

Preserve visible focus, native disclosure/forms, Escape, retained values, inert closing content, touch and keyboard input. Respect reduced motion, pause, forced colors and reduced transparency. Test actual rendered color/light combinations; do not infer universal contrast from pigment tokens. Follow MATERIAL.md and MOTION.md for implementation contracts and docs/VERIFICATION.md for evidence limits.
