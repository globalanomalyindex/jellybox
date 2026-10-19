# Testing and limits

I check behavior at the native/public boundaries and inspect the actual rendered study. These checks support the implemented interactions; they do not establish a universal performance, accessibility or usability result.

## Automated checks

Use Node 24 and the committed lockfile:

```sh
npm ci
npm run check
npm run pack:library
npm run check:package
npm run check:release
npm audit --audit-level=moderate
```

`check` runs component/model tests, strict consumer types and the static build. The suite covers native semantics, color ownership, sampled ink intent, shared motion/interruptions, density, slider input and story playback.

`check:package` installs the archive in a separate consumer, verifies core SSR/CSS without Three, then resolves the optional renderer with its peer. `check:release` checks staged source for private/generated/tool files, machine paths, broken local documentation links and inconsistent notices.

## Browser checks

`tests/browser/` contains focused regression scripts for Playwright CLI. Start the local Vite server, then open its printed URL:

```sh
npx --package @playwright/cli playwright-cli open http://localhost:5173 --headed
npx --package @playwright/cli playwright-cli run-code --filename tests/browser/closing-pigment.js
```

Use the relevant script for the change. Palette, window-palette and closing-pigment checks retain the current application path, so they can also run against the live `/jellybox/` study. `material-scope.js` uses a local Vite fixture to check the core-only SVG fallback. `scrollbar-alignment.html` exercises layout with a reserved scrollbar.

For visible changes I also check opening, switching, closing and reversal; preview versus commitment; keyboard/focus; compact layouts; motion preferences; and CSS fallback where affected. A screenshot or short recording is useful evidence, but does not replace working input.

## Current validation scope

The closing-color regression reproduces Color → Candy → Material → Close through native buttons and checks the displayed carrier during withdrawal. The correction retains the tool's pigment through the handoff. Related browser checks cover selected/custom colors, reopening, the shared palette and narrow layouts.

Recent native checks have exercised 1440, 1024, 390 and 320 px compositions, fixed disclosure/preview anchors, pause and reduced motion. A separate Chrome session with WebGL disabled exercised real CSS fallback. Broader physical Windows, touch-device, screen-reader, forced-color and pigment/light combinations still need evaluation.

## Limits I want to keep explicit

- Density, geometry, settling and lighting are authored real-time approximations, not validated fluid simulation or energy-conserving transport.
- Spectral.js supplies pigment-inspired mixing; it does not model transmission through real transparent jelly.
- Nine material samples per label can miss a local contrast problem. Native semantics and preference handling also require composition-specific accessibility testing.
- Frame pacing depends on hardware, browser, resolution and scene contents. A local timing improvement is not a device-wide framerate guarantee.
- The story's loading/outcome cycles are simulated examples. Reusable activity controls accept real application-owned state.
- I still need task-based usability research to evaluate whether the shared material makes ownership, grouping and change easier to understand.

The [roadmap](../ROADMAP.md) describes those next questions; the [changelog](../CHANGELOG.md) records shipped milestones.
