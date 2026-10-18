# Verification and limits

The release checks use 136 component/model tests plus 4 optional static-adapter tests, a clean install/build and a packed-package consumer. Coverage includes native server-rendered semantics, color policies, deterministic selection/window/density continuity, slider accepted-value behavior, cached receiver attachment between sampling ticks, scroll-cue hero/end guards bounded surface registration, chart loop timing/seams, preview/accepted grouping state, ink contrast policy, activity semantics, full-capsule activity support, bounded mesh displacement, shared-phase internal pigment, damped gathering/recoil across 30/60/120 Hz, retained retry/cancel velocity, persistent outcome thickness, inward ridge travel, bounded contour gathering/release, stopped ambient movement at rest and simulated task outcomes. Tests are behavior/model evidence, not a substitute for real browser or assistive-technology testing.

The prototype has also been inspected in the native browser for palette changes, dark pigment with light on/off, transparent title/body paint, folder/slider behavior, story navigation, first-screen composition and the progressive scroll cue's end/focus/selection guards. The release checks repeat subpath asset loading and core interactions on the deployed site. Screenshots in docs/media show actual views, not generated outcome evidence.

## Boundaries

- **Optics:** authored geometry, raster transmission, analytic receiver filtering and sampled caustics; no validated fluid conservation, full multiple-scattering solution or energy-conserving path tracer.
- **Color:** Spectral.js provides pigment-inspired interpolation; it is not a model of real transparent jelly. Custom pigments and moved/off light still need rendered contrast checks.
- **Accessibility:** native semantics, focus and preference handling are implemented. There is no blanket WCAG or assistive-technology certification; authors must validate their compositions.
- **Performance:** bounded surfaces/scissor/flux and cached geometry control work. Actual pacing varies with device, browser and scene. Previous active/withdrawn blur samples varied around 46–50fps under local load; no universal 60fps claim is made.
- **DOM/graphics:** real text remains above the canvas. The bottom effect uses browser backdrop filtering for HTML and a coordinated renderer strip for optical pixels.
- **Scope:** implemented mechanisms express design hypotheses. No controlled usability study has established that JellyBox improves navigation or task performance.
- **Assets:** the commercial font is not in public source or package archives. Public clones use the documented fallback; licensed builds can reproduce the author's typography.

The release process records the deployed commit and release checks in GitHub Actions and GitHub Releases. Re-run `npm run check`, inspect the package, and verify the real target when changing these boundaries.

## v0.5.5 inspection

The three-expert visibility policy was revised after native inspection rejected a label-shaped pale patch despite high ratios. The final implementation uses the entire existing body front, retaining its colored dense shoulders. Captured default-light samples included Generate12.91, Generated10.98 and Try again9.90 with solid black ink. Loading at13% measured7.14 with the fixed208×48px native target. Lamp-off loading and failure measured12.84 and9.92. A mobile Candy Explore tab measured5.49 with a transparent DOM face. These are observed nine-point samples in this browser/composition, not an exhaustive contrast guarantee.

Desktop and390px native checks covered loading/cancel/outcomes, a committed Candy palette, Explore return, fixed folder-handle open/close, lamp position/brightness and44px hairline links. The settled folder handle stayed at the same viewport coordinate through disclosure. Desktop lamp position remained Left when brightness/focus changed. Mobile width remained390px without horizontal overflow; temporary viewport overrides were reset. Shader/runtime inspection reported no warnings/errors. Cross-reviews found no remaining Spec or Standards blockers. Reduced-motion/pause model contracts remain checked; screen-reader, forced-colors and cross-device validation still need broader evaluation.
