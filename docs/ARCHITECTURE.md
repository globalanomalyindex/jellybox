# Architecture

## Two layers

`src/App.jsx` composes the three-tool study from package controls, a shared optical canvas and semantic DOM content. `packages/react` is an experimental reusable foundation. Importing its core does not import Three; the optional renderer entry does.

The site deliberately has no component gallery. Explore changes movement/layout and saves a local look; Color previews and commits pigment; Material changes optics. These panels demonstrate the wider system's rules, not every exported API.

## State and rendering

React owns committed values, visible panel, preferences, loading and saved-look outcomes. Decorative transitions never decide semantics. `useDockedToolbar` owns pill/tab/window handoffs; `useJellyWindow` owns the sink/emerge content handoff. Interrupted transitions continue from the displayed state. Closing content is inert and focus returns to its trigger.

Native DOM bounds are measured into one shared scene. The renderer shapes transparent volumes around fixed labels and targets. Parent density fields add thickness, absorption, normal and receiver changes within the same window. `JellyDetails` retains content/settings behind a fixed disclosure handle. Surface registration uses stable identities and bounded pools (32 optical surfaces and two selection groups).

One viewport-bounded document canvas follows scroll through `scrollFrame`; its scissor keeps work near the visible region. The page light/receiver continues through the article. Geometry caches settle at subpixel precision; expensive sampled caustics have bounded update rates. Three resources, observers and animation frames have explicit teardown.

Cached caustic textures are translated with their material every frame, independently of the sampling cadence. Document-canvas rebases do not change their attachment or the paper texture's document-space origin.

## Color and motion

`renderer/motion.js` is canonical for durations/curves. `useMaterialColor` and the Spectral helpers cache 33 samples and carry one 480 ms pigment transition. The renderer consumes displayed samples directly when marked sampled, avoiding a second interpolation. Core native focus, selected checks and labels change independently of decorative pigment.

Slider track travel is opt-in. The study uses one 240 ms accepted setting for callback, native value, number, fill and bulb after a deliberate click. Direct drag, value scrubbing and keys stay immediate. Escape cancels scrubbing; external controlled values remain authoritative.

`PagePresentation` supplies one initial arrival and a guarded bottom cue. The renderer filters its own bottom framebuffer strip; browser backdrop layers handle live DOM text. There is no screenshot/raster replacement of the article.

The story begins with 00 Abstract. Its density, motion and color figures reuse the package controls and the page's optical renderer. Visible story surfaces enter the same 32-slot pool with stable identities; offscreen hero bodies are culled without changing the light's document-space reference. The density figure borrows the parent-body slot while the main window is offscreen, with explicit ownership resetting optical history. It uses the actual folder field and optional bounded concentration input, not a separate outline or WebGL context. Standalone story controls use bounded contact casts to protect adjacent text.

The motion chart uses canonical curves/timings and Web Animations transform tracks. It loops only while at least 35% visible and the document is awake; Continuous motion off and reduced motion stop it. Its forward response runs at the real duration, settles for 480 ms, returns over 480 ms and rests 160 ms. All chart tracks share one explicit timeline origin. The material preview is registered into the existing optical pool, with only its transformed bounds refreshed during playback. There is no replay control or React frame clock. Color grouping has explicit preview, commit, revert and separate states. Its shared pigment and material connection show membership; words and icons carry the same meaning. These examples affect their own local state, never the main experiment or saved look. The state example uses the public JellyActivityButton, a clearly labeled simulated task, determinate/indeterminate progress, cancellation and selected outcomes. The light example temporarily routes the same point light to a visible task target; hover/focus previews lighting while the committed check stays put. Its bounded response uses the canonical gather curve and releases the main lamp when offscreen.

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


## Readable material

The optional optical renderer copies its current display-encoded framebuffer to a GPU texture and samples a 3×3 grid within each registered label’s actual DOM lettering bounds into a tiny atlas. One asynchronous readback, bounded to 40 labels and 10Hz, supplies actual material/light luminances without rendering DOM text into WebGL. Shared ink selection checks the least favorable sample, preserves passing ink, and keeps the lettering solid without glyph outlines. Mixed bright/dark samples retain their measured ratio rather than receiving a drawn contrast edge. DOM text remains native; extra HTML face fills are removed only on sampled surfaces. The CSS fallback accounts for its neutral transmitting receiver. Async resources and callbacks are disposed/guarded on unmount.
