# Design contract

## Purpose

A colorful, light-reactive interface that behaves as connected jelly. Its Macintosh/Frutiger Aero ancestry is vibrant and alive; changing density adds dynamic structure to the glass metaphor. The three tools are a proving ground for this wider system, not a claim of proven HCI benefits.

## Identity and composition

The supplied two-line black SVG is static and unshaded. Keep the opening logo, trio and broad credit/name block together in the first desktop viewport. The name aligns to the date's outer right edge. The story uses optional licensed Dessign Maison Regular, with an intentional system fallback in public builds. Control typography stays system sans. A simple gray editorial rule belongs to the story; jelly interiors use density instead of ledgers.

The story has a readable main column, persistent chapter index and a compact horizontal index. Native fragments and scroll position own chapter highlighting; document-end clamping still selects the final chapter. Working panels remain in document flow.

00 Abstract introduces the design-system proposition without calling this React Native or claiming tested UX benefits. Inline density, motion and color figures explain the adjacent prose using the actual controls and shared renderer. Four curves form a synchronized responsive grid. Story figures demonstrate automatically while visible, with quiet holds and no required clicks; the density dropdown stays optionally playable. Keep headings and functional states; omit instructional sub-blurbs. Density compares an open working group with a gathered folder side by side, sharing one rendered surface with independent choices and no timed state switching or traveling hover packet; shared pigment communicates membership and pending edits. The header contains Portfolio, Case study and GitHub links; Reset experiment belongs in Explore.

## Density and hierarchy

A quiet thin reading film and a concentrated perimeter belong to one parent. Inner groups are filled neutral clear-water concentrations with a narrow defined shoulder, broad crown and quieter receiver artifacts. No opaque inner white card, hollow glowing outline or residual pill over primary text.

Hover/focus gathers a moving filled shoulder within the inner concentration, sharing one attention envelope. Relief, pigment, highlights and refraction follow that shoulder while the reading plateau stays steady. Enabled inner controls own attention while hovered, focused or dragged. The parent melts its stronger gathering over420ms into a faint shared breath;280ms gather restores invitation. Its displayed density brakes the current while geometry, pigment and light stay connected. Structural density stays visible. Control density gathers locally within its existing body, with lighting following that local response. The demo does not send a separate packet from a folder edge into a control. Header/blank material can invite again once no child remains engaged; the fixed tab alone opens/closes the group. Static acknowledgement remains when continuous motion is off. Labels, icon cells, values and hit targets stay anchored. Selected rims, checks, explicit headings and task grouping establish hierarchy. Sliders keep label/value/short rail visible; their optical cross-section gathers on approach rather than moving endpoints.

## Color and state

Glass blue is the resting trio. Highlight invites interaction; a denser pigment expresses commitment. Save is green, Restore blue and Delete red. Focus/checks/words carry meaning as well as color. Explicit palette pigments remain visible at rest and gather more concentration on approach; committing a palette never requires hovering each tool to reveal it. Palette preview never silently commits. Use shared semantic tones and Spectral color paths; do not start a second renderer interpolation.

## Motion and light

A pill stretches into its top-left tab and withdraws on close; an old tab sinks as a new one gathers. Inner folders stretch/pinch and settle with a small bounded wobble. Text never deforms. One initial hierarchy settles by 900 ms, without delaying input or repeating on every section. Shared lighting and density follow the same material handoff. Hover, selection, loading and result are changes in this material, so quieting a parent must retain continuity with its active child. Text, native targets and semantics remain steady.

The movable bulb changes the material's highlights, transmitted casts and optical response. Effects support grouping; they cannot be the only source of state. The bottom progressive blur signals content below while yielding to the signature, focus, selected text and document end. It combines rendered pixels with native browser blur for HTML.

## Requirements

Preserve visible focus, native disclosure/forms, Escape, retained values, inert closing content, touch and keyboard input. Respect reduced motion, pause, forced colors and reduced transparency. Test actual rendered color/light combinations; do not infer universal contrast from pigment tokens. Follow MATERIAL.md and MOTION.md for implementation contracts and docs/VERIFICATION.md for evidence limits.


## Activity and attention

Loading is moving pigment inside the existing body. A broad current through the full blue capsule and a slow breath indicate active work. Its mesh, highlights and refraction move together. The displayed mass gathers into a lasting thicker outcome crown. Paired density ridges move inward while the ends pull in and the shoulders swell, with a localized compression, asymmetric release and diminishing ripple that settles by720ms. Thin film and dense current share two cached Spectral paths, reaching the exact semantic result on the480ms pigment phase. Shared pigment and optical fields carry the change; shape and momentum survive retry or cancellation. Known application progress remains explicit when available; the story shows persistent indeterminate circulation alongside automatic success, warning and failure specimens. Success, warning and failure use semantic color plus explicit labels/icons, with Cancel and Retry as real actions. The story labels its states as simulated; its passive specimens add no focus stops or announcements. The desktop lamp stays where the user places it and gives the workspace an adjustable ambient pool of light. Pointer/focus movement does not relocate it. Shared native ink intent stays steady; the whole optical front supports reading while actual samples verify contrast. No low-contrast gray fade, glyph outline or label-shaped white pill.

Compact control boundaries use thickness and concentration within the existing jelly, including a stronger absorptive shoulder on small slider thumbs. They replace the study's solid gray control strokes while keeping reading centers open. Blue keyboard focus and selected checks stay explicit; material density complements these signals rather than owning keyboard semantics.


## Desktop workspace scale

From900px viewport width, the main trio uses144px resting circles at the default131% tuning value and the open workspace is760px wide. Header controls are56px, compact slider/value targets48px; labels and body copy grow with them. The inner folder handle stays204×44px. Smaller layouts retain their existing bounded geometry. Scaling uses actual CSS dimensions measured by optics, not a transformed container.

## Pigment ownership

A tool's ordinary inner controls share its window pigment through `JellyMaterialProvider`. Rest is a quieter concentration; approach and selection gather within that identity. Sliders, choices and the folder's local shoulder belong to their parent, while explicit pigments and success/warning/danger retain their roles. Label ink remains independent of the decorative pigment.
