# Motion

Canonical values live in `packages/react/src/renderer/motion.js`. CSS, DOM handoffs and rendered material share them. These are authored interface timings informed by viscoelastic settling, not measurements of gelatin.

| Purpose | Time | Curve / behavior |
| --- | --- | --- |
| Tool expansion / collapse |460 /320ms | Shared jelly spatial curve; native target layout preserves existing circle/pill redistribution |
| Window opening / withdrawal |760 /700 ms | `gather` / `withdraw`; one shell/pill ownership handoff |
| Inner folder gather / melt |620 /560ms | Shared disclosure phase; bounded strain settles afterward |
| Pigment |480 ms | Monotonic pigment curve; cached Spectral samples, no second clock |
| Activity gather / spatial settle |480 /720 ms | Displayed pigment phase owns density; localized compression, asymmetric release, diminishing ripple |
| Material response / feedback |240 /120ms | Shared effects/settle |
| Press / recoil |65 /480 ms | Squeeze then bounded spatial overshoot |
| Slider click travel |240 ms | Shared gather; actual accepted value, rail, bulb, number and callbacks agree |
| Slider gather / melt / exit grace |280 /420 /120ms | Optical cross-section only; targets remain44 px |
| Magnetic rise / follow |140 /180ms | Rise precedes bounded attraction; target/text stay fixed |
| Ambient breath |5300ms | Pausable; Still and reduced motion remove it |
| Skeleton |1200ms | Real loading, no artificial delay; reduced motion removes shimmer |

## Curves

`settle = cubic-bezier(.22,1,.36,1)` is monotonic arrival/deceleration. `gather = cubic-bezier(.32,0,.2,1)` and `withdraw = cubic-bezier(.38,0,.24,1)` give larger masses a deliberate start and settled finish. `pigmentCurve = cubic-bezier(.22,0,.2,1)` remains bounded. `spring = cubic-bezier(.22,1.12,.36,1)` and `recoilCurve = cubic-bezier(.18,1.48,.32,1)` are intentional spatial jelly responses; never use overshoot for native values, opacity or semantic state.

## Continuity

The selected pill stretches/pinches into the parent border and gathers back on close. During switching, the old tab withdraws as the next takes ownership. Text remains anchored and outgoing content becomes inert. Reversals continue from displayed state with retained momentum; explicit settled ownership prevents residual carriers. A closing window temporarily retains document extent while its handle owns pointer/focus, so gathering does not move the user's target through scroll clamping.

Shape & optics applies its measured disclosure phase once across layout reveal and optical density. Geometry, normals, pigment/thickness and receiver filtering share the local strain. Its title, icon and native target never deform. Hover/focus acknowledges approach over240ms, moving a fuller blue concentration through the entire area. Its2500ms internal current carries a broad crown and bounded shoulder strain; a5300ms breath modulates its energy. Geometry, normals and receiver share that field. Pause/Still retain static blue feedback and remove ambient movement; reduced motion makes the acknowledgement immediate.

## Direct input

Only deliberate track clicks use the opt-in240 ms accepted-value travel. Thumb drag, scrub and keyboard remain immediate. Shift changes scrub precision without jumping; Escape restores the drag origin. External controlled changes cancel stale gestures. Continuous motion off pauses idle breathing/assistance while preserving deliberate input feedback; OS reduced motion snaps spatial travel.

Material assistance is bounded to 3 px, or 5 px for slider bulbs, toward one nearby pointer. Touch, active press/drag, window morphing, motion-off and reduced motion clear it. The actual clickable area never moves or activates automatically.

## Page arrival

One mount-only monotonic clock brings in header0–240 ms, identity80–500ms, tools200/255/310–680/735/790ms, credits320–800ms and story420–900ms. Identity and text only fade; rendered tools settle from 4 px extra elevation, with the same opacity/cast sample as their DOM faces. Input, restored/story scroll, hidden document or reduced motion completes the arrival immediately. Panel changes and normal scrolling do not replay it.

The bottom scroll cue uses the160ms effects fade; reduced motion makes it immediate. Blur progresses spatially toward the viewport edge, with no ambient attention animation. Native scrolling is unchanged.

## Story explanations

Four response charts loop together in a responsive grid. Their2520ms shared repeat period contains the real760/700/240/480ms forward responses,480ms settling,480ms return and the remaining quiet hold. Every marker, playhead, revealed path and optical thumb shares one origin; SVG reveal and markers use the same responsive path metric. The native text is steady. The four optical bounds are refreshed while playing, within the existing renderer pool.

A shared visible-time lifecycle freezes examples offscreen or while the document is hidden, without catch-up. Any visible part can activate a tall mobile figure. Motion-off, Still and reduced motion show static explanatory endpoints. A single80ms scheduler publishes only changed semantic stages, rather than running per-figure React frame loops. No replay or choice action is required. Actual package specimens are inert and removed from focus/announcements; static headings carry their meaning. Dropdowns and their contents remain optionally playable.

The state figure keeps an indeterminate loader beside three coordinated results. Illustrative loading holds2500ms, then results hold3500ms;6000ms repeats leave time for the existing gathering/recoil to settle. Density has two2650ms holds within the5300ms breath period, with the canonical240ms material response. Color uses four2500ms stages: separate, shared, pending, accepted. Its480ms Spectral paths own the transitions. The ambient lamp holds each explicit placement4500ms, using the existing240ms gather on repositioning. These are demonstration cadences, not application task durations or measured jelly constants.

Activity moves a capsule-supported internal current over2500ms with a5300ms breath. Geometry, normals, absorption and receiver light share its field. The host publishes the already-eased480ms pigment sample after its DOM color commits; gain, gather and density consume that sample directly. Two cached33-sample Spectral paths carry thin film and dense current to the same exact semantic endpoint, with the relief field blending their concentrations. There is no second pigment clock or spring following the sample.

Completion slows the displayed current as paired density ridges draw inward. An authored720ms spatial track supplies localized compression, an asymmetric release and one diminishing ripple. It replaces the old completion kick, stacked following springs and whole-body lift. At208×48px the model bounds the end tuck to3–5px and shoulder swell to2–3px. The reading center and native target stay fixed. Pigment reaches its exact endpoint by480ms; light and geometry finish the small ripple by720ms and retain a thicker result crown. Retry/cancel capture the displayed mass, concentrations and continuation velocity. A low-level host can omit activityPhase for a local480ms response; omitting activityColor uses the displayed body tint and a cheap loading-blue fallback, without constructing animated Spectral paths. The retained activityResponse/activityStrain constants remain public for compatibility; this track uses activitySettle instead. These are authored interface responses, not physical jelly measurements.

Continuous-motion off freezes circulation; reduced motion snaps spatial state. Native task labels, semantics and completion remain immediate. Fixed activity icon/label slots and click targets do not bounce. The ambient desktop lamp keeps its canonical240ms gather response on explicit repositioning; hovering or focusing another control does not move it.

## Verification

Test interruption, rapid retargeting, close/reopen, focus return, pause, keyboard and reduced motion in the affected composition. Model tests cover deterministic continuity; they do not replace browser/device testing. Avoid claims that these values are physical jelly constants or proven HCI improvements.
