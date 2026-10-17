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

Shape & optics applies its measured disclosure phase once across layout reveal and optical density. Geometry, normals, pigment/thickness and receiver filtering share the local strain. Its title, icon and native target never deform.

## Direct input

Only deliberate track clicks use the opt-in240 ms accepted-value travel. Thumb drag, scrub and keyboard remain immediate. Shift changes scrub precision without jumping; Escape restores the drag origin. External controlled changes cancel stale gestures. Continuous motion off pauses idle breathing/assistance while preserving deliberate input feedback; OS reduced motion snaps spatial travel.

Material assistance is bounded to 3 px, or 5 px for slider bulbs, toward one nearby pointer. Touch, active press/drag, window morphing, motion-off and reduced motion clear it. The actual clickable area never moves or activates automatically.

## Page arrival

One mount-only monotonic clock brings in header0–240 ms, identity80–500ms, tools200/255/310–680/735/790ms, credits320–800ms and story420–900ms. Identity and text only fade; rendered tools settle from 4 px extra elevation, with the same opacity/cast sample as their DOM faces. Input, restored/story scroll, hidden document or reduced motion completes the arrival immediately. Panel changes and normal scrolling do not replay it.

The bottom scroll cue uses the160ms effects fade; reduced motion makes it immediate. Blur progresses spatially toward the viewport edge, with no ambient attention animation. Native scrolling is unchanged.

## Story explanations

The curve chart loops while at least 35% visible, using compositor transform tracks sampled from the canonical curve. The forward response keeps its actual duration, then settles for 480 ms, returns over 480 ms with the settle curve, and rests 160 ms. The revealed curve, marker, travel and bounded material strain use the same keyframe samples and explicit Web Animations start time. The preview is a real shared optical surface; only that moving surface is remeasured during playback. Recoil is the initial response so the authored overshoot is visible immediately. Hidden/offscreen, paused and reduced-motion states cancel playback. Curve choices remain immediate, with no replay button. Density/color controls retain their normal native input behavior and shared pigment clocks.

Activity twists a broad internal density field over 2500 ms, with a 5300 ms breath, while loading. Its normals and absorption share that field. Entering/leaving activity uses the canonical 240 ms material response. Known and unknown progress share the circulation; actual progress/labels stay application-owned. The spotlight follows preview targets over the canonical 240 ms gather response. Dynamic ink changes immediately to retain contrast; pigment continues to follow its 480 ms path.

## Verification

Test interruption, rapid retargeting, close/reopen, focus return, pause, keyboard and reduced motion in the affected composition. Model tests cover deterministic continuity; they do not replace browser/device testing. Avoid claims that these values are physical jelly constants or proven HCI improvements.
