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

`renderer/motion.js` is canonical for durations/curves. `useMaterialColor` and the Spectral helpers cache 33 samples and carry one 480 ms pigment transition. The renderer consumes displayed samples directly when marked sampled, avoiding a second interpolation. Activity controls publish the same eased phase after the pigment sample commits to the DOM. Their internal pigment consumes that same phase through two cached33-sample paths (thin film and dense current), spatially blended by the material relief. The dense row leads and the thin film follows within the same phase; both displayed row colors are captured on interruption. Unequal orbiting lobes keep moving as density ridges draw inward. Gain, gather and density directly follow the displayed sample. A separate localized720ms compression/release track retains displayed continuity on interruption; paired density ridges travel inward while the ends tuck and shoulders swell. It finishes a diminishing ripple after pigment reaches its exact480ms endpoint, leaving a persistent thicker result crown. The33×2 atlas uploads only on retarget; a custom host without activityColor uses a cheap displayed-tint fallback. No per-frame Spectral solving or forced whole-body bounce is added. Its circulation and breath stop, so the settled shape can reuse its geometry. Geometry, optical normals and receiver light use this response, while native semantics and target bounds remain immediate. Core native focus, selected checks and labels change independently of decorative pigment.

Slider track travel is opt-in. The study uses one 240 ms accepted setting for callback, native value, number, fill and bulb after a deliberate click. Direct drag, value scrubbing and keys stay immediate. Escape cancels scrubbing; external controlled values remain authoritative.

`PagePresentation` supplies one initial arrival and a guarded bottom cue. The renderer filters its own bottom framebuffer strip; browser backdrop layers handle live DOM text. There is no screenshot/raster replacement of the article.

The story begins with 00 Abstract. Its density, motion and color figures reuse the package controls and the page's optical renderer. Visible story surfaces enter the same 32-slot pool with stable identities; offscreen hero bodies are culled without changing the light's document-space reference. The density figure borrows the parent-body slot while the main window is offscreen, with explicit ownership resetting optical history. It uses the actual folder field and optional bounded concentration input, not a separate outline or WebGL context. Standalone story controls use bounded contact casts to protect adjacent text.

The story figures demonstrate themselves while visible. `useStoryPlayback` shares one observer, document-visibility listener, reduced-motion listener and bounded80ms semantic sampler across figures. Each figure counts only its visible, awake playback time; leaving the screen freezes that time without catch-up. Held samples do not rerender React. Motion-off, Still and reduced motion show meaningful static snapshots. Every subscription, timer and animation is disposed. The optical scene retains its existing scroll/scissor guard and surface budget.

Four Bézier cells form one responsive grid. Web Animations owns their transforms, with one origin and2520ms repeat period while preserving the real760/700/240/480ms forward responses. Canonical settling and return tracks finish before a quiet hold. All four optical previews refresh their transformed bounds; the rest of the story does not need a full layout measurement every chart frame. SVG path revelation uses the same path metric as the marker at responsive scales.

The activity figure shows one persistent indeterminate loader beside three coordinated loading-to-result specimens. A6000ms illustrative cycle holds loading2500ms and success/warning/failure3500ms so their real material gathering can settle. These are labeled simulated states; the public activity component still accepts application-owned state and starts no task timer. Visual specimens use actual package components in inert, aria-hidden wrappers, with readable static headings outside and no dead focus stops or live-region chatter.

Color illustrates separate pigments, shared identity, a pending edit and accepted pigment automatically. Cached Spectral color paths still own the480ms material response. Density shows an open reading film beside a gathered folder within one shared rendered parent. Both are held examples with independent included-item choices; only the real disclosure changes the folder. The story does not nominate a spatial transfer receiver, so child hover keeps local material feedback without a traveling packet across the comparison. The ambient desktop-lamp illustration holds Left/Center/Right placements for4500ms each, using the same scene light at a fixed height/brightness. Placement never follows pointer/focus. All examples are independent of the main experiment and saved look.

## Persistence and boundaries

`useSavedLook` stores one explicit versioned browser-local snapshot, with restoration, deletion and undo. Normal edits/reset are ephemeral; no backend, analytics or account is required. A failed storage operation cannot report success.

The static site builds to `dist/client`. Hash links keep story navigation compatible with GitHub Pages. The optional `worker/` + Sites preparation adapter is independent of the Pages path. The licensed font is a build-only optional asset, never part of Git or the reusable package.

Compact control boundaries use `control-density.js`: one finite rounded-volume field with matching CPU/GLSL derivatives. Existing compact meshes gain local relief; the same per-fragment field changes normals, thickness and absorption without an extra mesh, palette or context. `material.js` owns bounded rest/approach/commitment concentration and the small-thumb path compensation. The grouped selection carrier remains the single commitment owner. Reading accommodation runs after the optical shoulder, leaving native ink and bounds independent.

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

The native CSS skin owns one independent `--jb-reading-ink` intent, shared with the optional renderer. Built-in transmitting skins use black; an intentionally dark custom skin can choose white. Each optical body’s front supports reading through a shorter absorption path and quieter reflections, with the existing contour and dense shoulders retained. Activity keeps a full-width quiet center while its shoulders expose the moving relief; its bounded absorption cap follows actual relief rather than flattening density into a constant tint. Dark pigments keep the conservative reading cap. No lettering-shaped optical patch, HTML backing or post-light repaint is added.

The renderer copies its current display-encoded framebuffer to a GPU texture and samples a3×3 grid within each registered label’s actual DOM lettering bounds. One pending asynchronous readback verifies the intended ink at10Hz for ordinary labels and up to eight active/settling labels at30Hz. The fixed9×40 physical atlas sets its target viewport directly, independently of page DPR. Results retain actual worst contrast, including failures; readback errors report0. Sampling is verification, never a high-frequency typography director. Stale opposite-ink results are discarded. Resources/callbacks are disposed on unmount; native text is never rasterized into WebGL.

Open-folder approach is owned by the native group while the fixed disclosure handle alone toggles it. Enabled children take priority through native hover/focus and existing slider engagement/drag metadata. DOM measurement forwards raw invitation and optional childActive ownership. One existing response gathers over280ms, melts over420ms to a12% child shoulder or zero on genuine exit, and brakes a retained angle from that same gain. Shared scene time owns the faint breath and freezes phase on pause. Structural density stays unchanged. Main and story observers share that ownership, and CSS fallback follows the same metadata; no gesture tracker or independent clock is introduced. The response feeds a local density shoulder in `density-field.js`; CPU height/derivatives, analytic GPU optics and receiver filtering share its support. The existing density texture carries parent clearing and a second cached blue-delta row. Local gathering indexes that row independently of saturated plateau coverage, so hover does not require per-frame texture uploads. Reading accommodation yields at that same shoulder while the content plateau stays quiet. The existing scene time freezes circulation in paused/reduced modes. Deliberate response invalidation and ambient geometry sampling remain separate; no new renderer, mesh or animation clock is added.


The live demo uses local control density and the shared parent/child attention envelope. It does not nominate `OpticalDensity.transferTarget` for any control, so no packet travels from a folder edge into slider bulbs, value bubbles or choices. The adapter has no receiver arbitration, priority override or nested transfer-coordinate projection. Local hover/focus, selected density, accepted slider values and native geometry remain with their existing owners. The optional renderer's low-level transfer API remains available to external hosts; it is not enabled by the shipped demo.

Slider hover is owned by the shared native component. `interaction.js` tests the current rounded bulb and value bounds rather than the whole row or rail. Canonical exit grace keeps material release smooth. The study and optional scene do not overwrite slider metadata through broad delegated pointer/focus handlers. Native focus and gesture ownership remain independent, and the existing accepted-value layout cycle rechecks a stationary pointer as its bulb moves. App assistance uses the explicit bulb pointer state, so it cannot widen this hover boundary. Native rail targets remain 44 px high.
