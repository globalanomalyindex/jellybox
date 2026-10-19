# Architecture

I keep the study's composition separate from its reusable React foundation. The website uses the controls and material rules included in the package.

| Location | Responsibility |
| --- | --- |
| `src/` | Three-tool study, lighting, saved look, design story and page composition |
| `packages/react/src/` | Native controls, styles, types, semantic color and shared hooks |
| `packages/react/src/renderer/` | Optional optical geometry, density, light and transition models |
| `packages/react/test/`, `tests/` | Component/model checks, consumer types and browser regressions |
| `public/brand/` | Editable logo, source image and provenance |

## State and handoffs

React owns committed values, active tool, preferences, loading and save outcomes. Decorative motion never decides semantic state. `useDockedToolbar` owns pill/tab/window handoffs; `useJellyWindow` owns sink/emerge content switching. Outgoing content becomes inert and focus returns to the tool on close. Interrupted motion continues from its displayed state.

One 480 ms Spectral clock owns the window pigment. Opening follows the tool's accent; withdrawal targets the same tool's quieter resting pigment. Changes can retarget that displayed color without restarting spatial travel. `JellyMaterialProvider` scopes the raw accent to ordinary inner controls, while explicit pigments and semantic outcomes remain independent. Optical carriers and the SVG fallback read the same native target; already-sampled colors do not pass through a second interpolation.

## One optical scene

Native DOM bounds register into one optional Three.js scene. The study measures the canvas's actual CSS width and origin, including scrollbar changes. A viewport-bounded document canvas and scissor follow scrolling; the receiver and lamp continue below the hero. Cached caustic fields remain attached between expensive sampling ticks.

The scene supports 32 registered surfaces and two selection carriers. Stable identities retain optical state; overflow uses CSS/SVG. Geometry and light-field updates are bounded and cached. Shader variants prepare during idle time using the existing pool. Contrast readback yields during window morphs, with native ink intent retained. Resources, observers and frames are disposed on teardown.

The core package imports no Three or browser globals at module load. The optional renderer entry supplies `JellyScene` and the lower-level `createOptics` adapter.

## Shared material

Compact controls have an interior density shoulder whose geometry, normals, thickness and absorption agree. A parent density field supplies an inner folder's filled structure, optical shoulder and receiver filtering within the same window. Child input quiets the folder's extra invitation while keeping structural density visible. The shipped study uses local feedback; the optional low-level spatial transfer API remains available to external hosts.

Color uses cached 33-sample Spectral paths. Loading-to-result motion samples thin-film and dense-current paths from one host phase, followed by a localized 720 ms release. Native labels, values and targets remain steady. `MATERIAL.md` and `MOTION.md` are the detailed references.

Palette preview identity belongs to the Color panel, separately from committed colors. Its passive samples project their provisional invitation into the existing hover response. Commit, cancel and unmount release it; there is no additional JavaScript animation clock.

## Reading

Built-in transmitting skins use stable native black ink. Intentionally dark custom skins can choose white. The whole front thins and quiets beneath text while shoulders stay colored; there is no label-shaped backing or glyph outline.

A fixed 9×40 asynchronous atlas checks nine material samples behind each label. Ordinary readings run at most 10 Hz; up to eight active/settling labels receive 30 Hz priority, with one readback pending. Results report the weakest sampled contrast, including failures, and do not oscillate letter colors with lighting. This is bounded verification, not exhaustive accessibility certification.

## Story and persistence

The story reuses the same renderer and controls. One visible-time lifecycle stops explanatory loops offscreen, while hidden, paused, Still or reduced-motion. It resumes without catch-up. The density examples hold their state while played with; other figures use explicit illustrative cadences. Passive specimens add no focus stops or live-region chatter.

`useSavedLook` stores one versioned browser-local snapshot. Saving is explicit; tuning and reset do not overwrite it. Restore, delete, undo and storage failure have working outcomes. There is no backend or account.

## Build and assets

Vite builds a static site to `dist/`; GitHub Pages serves it under `/jellybox/`. Hash navigation needs no server rewrite. The same build works at `/` or another configured base path. The separately licensed story font is optional private build input and never enters Git or the component archive.

See [design](DESIGN.md), [components](COMPONENTS.md), [testing](TESTING.md) and [deployment](RELEASING.md) for the corresponding contracts.
