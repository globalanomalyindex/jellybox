# Working on JellyBox

JellyBox is a focused three-button interaction study with a reusable React foundation. Preserve its current identity; it is not a component catalog website.

## Commands and structure

Use Node 24 and `npm ci`. App UI lives in `src/`, reusable controls in `packages/react/src/`, optional Three optics in its `renderer/` directory. `npm test` checks component/model behavior; `npm run build` builds the site and optional static adapter; `npm run check` runs those plus adapter checks. Run `npm run pack:library` and `npm run check:release` for release work.

Read README.md, docs/ARCHITECTURE.md, MATERIAL.md, MOTION.md and docs/DESIGN.md before changing cross-cutting behavior. Use docs/COMPONENTS.md for public component contracts. Track work in GitHub Issues; keep decisions alongside the affected public documentation.

## Visual and interaction contracts

- Black static SVG identity; native cursor. Keep the supplied letter silhouettes/counters. The approved story/name font is optional licensed Dessign Maison; never commit it. Public clones deliberately use the fallback.
- The same parent jelly supplies thin reading film and dense boundaries. Inner folders are filled density changes, not glowing outlines or opaque cards.
- Text and actual hit targets stay fixed. Material can stretch, gather, sink and settle around them. Primary icon/title faces and window body remain transparent; never restore the white inner-pill backing.
- One clock owns each transition. Window opening 760 ms and withdrawal 700 ms preserve momentum and ownership; the pill becomes its top-left tab and gathers back on close. Shape & optics has a fixed 204×44 px handle and a shared density phase. Do not add competing size/color clocks.
- Pigment uses cached Spectral paths with a 480 ms shared clock. Semantics, focus and labels remain independent of decorative color.
- Actual slider click changes share a 240 ms accepted value with number, rail and bulb. Drag, scrub and keys remain direct. Targets stay 44 px; Shift refines and Escape cancels scrubbing.
- Assistance moves only the material toward one nearby pointer, never the target; disable for touch, motion-off, reduced motion, active gestures and window transitions.
- Save is explicit/local. Tuning/Reset must not overwrite or delete a saved look. Handle storage failure honestly.
- Keep native disclosure, form and keyboard semantics, visible focus, retained values, inert closing content and focus return. Preserve CSS/forced-color fallback and reduced-motion behavior.
- The page receiver continues below the hero. The viewport-bounded scroll frame/scissor preserves attachment. Do not hide it at the hero boundary.
- One load-only hierarchy completes by 900 ms or immediately on input/restored scroll/reduced motion. Bottom blur yields to signature, focus, selected text and document end. HTML blur is browser compositing; do not claim WebGL samples DOM text.

## Engineering and claims

Keep the core entry usable without Three or browser globals. Do not add independent WebGL contexts or unbounded per-control work. Dispose resources/observers/frames and retain surface/selection budgets. Preserve the optional Sites files (`.openai`, `worker`, `scripts/prepare-sites-build.mjs`, adapter tests).

Test behavior at native/public interfaces, not source strings. Use the existing suite and real browser checks for affected states; do not add tautological tests for CSS or prose. Verify root and `/jellybox/` asset paths for deployment changes. Inspect public package contents and source licensing before release.

Bound all claims: authored raster optics are not validated fluid simulation or energy-conserving transport. Reduced draw counts are not universal 60fps. Native semantics are not a blanket accessibility certification. Record what was actually checked and what still needs user/device testing.
