# Architecture

## Two layers

`src/App.jsx` composes the three-tool study from package controls, a shared optical canvas and semantic DOM content. `packages/react` is an experimental reusable foundation. Importing its core does not import Three; the optional renderer entry does.

The site deliberately has no component gallery. Explore changes movement/layout and saves a local look; Color previews and commits pigment; Material changes optics. These panels demonstrate the wider system's rules, not every exported API.

## State and rendering

React owns committed values, visible panel, preferences, loading and saved-look outcomes. Decorative transitions never decide semantics. `useDockedToolbar` owns pill/tab/window handoffs; `useJellyWindow` owns the sink/emerge content handoff. Interrupted transitions continue from the displayed state. Closing content is inert and focus returns to its trigger.

Native DOM bounds are measured into one shared scene. The renderer shapes transparent volumes around fixed labels and targets. Parent density fields add thickness, absorption, normal and receiver changes within the same window. `JellyDetails` retains content/settings behind a fixed disclosure handle. Surface registration uses stable identities and bounded pools (32 optical surfaces and two selection groups).

One viewport-bounded document canvas follows scroll through `scrollFrame`; its scissor keeps work near the visible region. The page light/receiver continues through the article. Geometry caches settle at subpixel precision; expensive sampled caustics have bounded update rates. Three resources, observers and animation frames have explicit teardown.

## Color and motion

`renderer/motion.js` is canonical for durations/curves. `useMaterialColor` and the Spectral helpers cache 33 samples and carry one 480 ms pigment transition. The renderer consumes displayed samples directly when marked sampled, avoiding a second interpolation. Core native focus, selected checks and labels change independently of decorative pigment.

Slider track travel is opt-in. The study uses one 240 ms accepted setting for callback, native value, number, fill and bulb after a deliberate click. Direct drag, value scrubbing and keys stay immediate. Escape cancels scrubbing; external controlled values remain authoritative.

`PagePresentation` supplies one initial arrival and a guarded bottom cue. The renderer filters its own bottom framebuffer strip; browser backdrop layers handle live DOM text. There is no screenshot/raster replacement of the article.

## Persistence and boundaries

`useSavedLook` stores one explicit versioned browser-local snapshot, with restoration, deletion and undo. Normal edits/reset are ephemeral; no backend, analytics or account is required. A failed storage operation cannot report success.

The static site builds to `dist/client`. Hash links keep story navigation compatible with GitHub Pages. The optional `worker/` + Sites preparation adapter is independent of the Pages path. The licensed font is a build-only optional asset, never part of Git or the reusable package.

## Where to change things

| Concern | Source |
| --- | --- |
| Tool content and presets | `src/PanelContent.jsx`, `src/experiment.js` |
| Pill/tab handoff and withdrawal | `src/useDockedToolbar.js`, renderer `tab-*` modules |
| Density profile and inner folder | `src/JellyDetails.jsx`, renderer `density-field.js`, `volume-profile.js` |
| Optical material and light | renderer `material.js`, `optics.js`, `lighting.js` |
| Shared native controls | package `components.jsx`, `controls.jsx`, `data-components.jsx` |
| Public type surface | package `index.d.ts`, renderer `index.d.ts` |
| Semantic pigment and transitions | package `tokens.js`, `color.js`, `useMaterialColor.js` |
| Page/story composition | `src/styles.css`, `DesignStory.jsx`, `PagePresentation.jsx` |

See MATERIAL.md and MOTION.md for the functional contracts. Keep new behavior local to its owner rather than adding parallel clocks or per-control rendering contexts.
