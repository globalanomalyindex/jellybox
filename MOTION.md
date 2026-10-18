# Motion

Canonical values live in `packages/react/src/renderer/motion.js`. CSS, DOM handoffs and rendered material share them. These are authored interface timings informed by viscoelastic settling, not measurements of gelatin.

| Purpose | Time | Curve / behavior |
| --- | --- | --- |
| Tool expansion / collapse |460 /320ms | Shared jelly spatial curve; native target layout preserves existing circle/pill redistribution |
| Window opening / withdrawal |760 /700 ms | `gather` / `withdraw`; one shell/pill ownership handoff |
| Inner folder gather / melt |620 /560ms | Shared disclosure phase; bounded strain settles afterward |
| Pigment |480 ms | Monotonic pigment curve; cached Spectral samples, no second clock |
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

Shape & optics applies its measured disclosure phase once across layout reveal and optical density. Geometry, normals, pigment/thickness and receiver filtering share the local strain. Its title, icon and native target never deform. Hover/focus wakes a restrained5300ms density breath through a240ms settle response; this shared geometry/normal/receiver motion is removed by motion-off or reduced motion.

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

Activity moves a capsule-supported internal current over 2500 ms, with a 5300 ms breath. Geometry, normals, absorption and receiver light share its field. The 480 ms pigment sample is published after that color reaches the DOM and colors both body and internal current; there is no second color clock. A damped spatial response follows that phase (12 rad/s, damping ratio .52); local compression/release uses 12 rad/s and .4. Completion keeps the current angle while the flow draws inward, densifies and releases into a small recoil. The paired density ridges move toward a retained result crown as the ends pull inward and the shoulders swell. At the 208×48 example, the authored peak is about 7 px inward per end and 4 px of shoulder bulge; the native target stays unchanged. Most visible settling finishes around 1 s; the subpixel tail snaps to its exact endpoint around 1.75 s in the 60 Hz model. These are authored response parameters, not measured physical constants. Geometry, normal/light response and receiver follow the same strain; text and targets do not transform. Retry/cancel retarget from displayed values. A low-level optical host can omit `activityPhase` for the canonical local 480 ms response. Continuous-motion off freezes circulation; reduced motion snaps spatial state. Native labels and task completion remain immediate, with fixed activity icon/label slots. The ambient desktop lamp keeps its canonical240ms gather response on explicit repositioning; hovering or focusing another control does not move it.

## Verification

Test interruption, rapid retargeting, close/reopen, focus return, pause, keyboard and reduced motion in the affected composition. Model tests cover deterministic continuity; they do not replace browser/device testing. Avoid claims that these values are physical jelly constants or proven HCI improvements.
