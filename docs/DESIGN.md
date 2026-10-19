# Design principles

I’m exploring one shared jelly material as a language for appearance and interaction. My starting point is the colorful, translucent, light-reactive quality of old Macintosh interfaces and Frutiger Aero. Density gives that material structure: it can gather into a boundary, thin into a reading area or divide into working groups.

The three tools are a focused test bed for this larger system. The interactions are implemented; the proposed HCI benefits still need testing.

## Density carries structure

A border is a concentrated part of the same material as its contents. Inner groups have a filled reading plateau, a defined shoulder and quieter light effects behind their content. They remain visibly related to their parent. The main experiment uses local gathering around controls; no detached blob travels across a folder into a selection.

Ordinary inner controls inherit the workspace pigment. Explicit colors and success, warning and danger roles retain their meaning. Checks, labels and focus indicators communicate state alongside color.

## Continuity explains ownership

A button becomes a pill, joins the top-left edge of its window as a tab, then gathers back on close. Switching lets the old tab withdraw while the next one joins. The displayed shape and pigment continue through interruptions.

The material can stretch, pinch and settle. Native targets, text, icons and values stay anchored. A closing window retains its tool's pigment as it settles into that tool's resting tint.

Preview and commitment are distinct. Palette samples breathe through the shared hover response while a different palette is pending; click or Enter commits, while Escape or departure restores the accepted palette. No preview silently changes saved settings.

## Light belongs to the workspace

The bulb is an adjustable desktop lamp. It stays where placed; hovering another control does not move it. The material responds with highlights, transmitted color and restrained surface casts. Light reinforces depth and grouping, while reading and selected state remain understandable with the lamp off.

## Expressive material, predictable input

Sliders keep a label, value and short rail visible. The bulb and value bubble own hover feedback; the rail still accepts deliberate input. Value bubbles support scrubbing, Shift refines and Escape cancels. Magnetic assistance moves only material toward the cursor.

An enabled inner control takes attention from its folder, letting the parent's extra movement settle into a faint shared breath. Pause, Still and reduced motion keep static acknowledgement. Native forms, keyboard input, visible focus, retained values and CSS/forced-color fallback remain part of the system.

Loading moves through the whole capsule. Density, color and highlights gather into a semantic result, with a small local settling response. Labels and icons make the result explicit. The story's task examples are labeled simulations; the reusable controls accept real application-owned states.

## Composition

The black SVG identity is static. The logo, three tools and broad author signature share the desktop opening view. The name aligns with the date's right edge. My story uses optionally licensed Dessign Maison; controls use system sans. A gray editorial rule organizes the story, while density organizes the jelly interiors.

At desktop widths from 900 px, resting buttons are about 144 px at the default 131% setting, the workspace is 760 px wide, header controls are 56 px and slider/value targets are 48 px. The inner-folder handle remains 204×44 px. Smaller screens use bounded layouts. Optics measure actual CSS bounds.

Chapters follow native fragment navigation and scroll position. Explanatory figures run automatically while visible and stop offscreen without catching up. The density comparison remains stable while its dropdown is optionally playable. The bottom scroll cue yields to reading, focus, the signature and document end.

## Vocabulary

- **Pill:** the expanded tool button showing its icon and name.
- **Attached tab:** that pill after joining the top-left window border; it still identifies the owning tool.
- **Density:** a changing concentration that establishes boundaries, hierarchy and grouping through the whole area.
- **Reading film:** the quieter, thinner front of a material surface that supports native text.
- **Desktop lamp:** a user-positioned ambient light independent of hover, focus and task selection.

The [material reference](../MATERIAL.md), [motion reference](../MOTION.md) and [API guide](COMPONENTS.md) describe the implementation. [Testing and limits](TESTING.md) distinguish checked behavior from unvalidated claims.
