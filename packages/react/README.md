# JellyBox React foundation

Experimental React controls and a shared jelly material, used by the [JellyBox study](https://globalanomalyindex.github.io/jellybox/). Seventeen core components work with CSS/SVG alone; optional Three.js rendering supplies depth, transmitted light and connected density. This 0.5.13 preview is distributed on GitHub Releases, not npm.

## Install

```sh
npm install https://github.com/globalanomalyindex/jellybox/releases/download/v0.5.13/jellybox-react-0.5.13.tgz
```

React and React DOM 18/19 are peers. Import CSS once. For the optical entry, also install the supported Three 0.186 peer.

```jsx
import { useState } from 'react';
import { JellyButton, JellySelectionGroup, JellySurface } from '@jellybox/react';
import '@jellybox/react/styles.css';

export function Example() {
  const [value, setValue] = useState('soft');
  return <JellySurface tone="info">
    <JellySelectionGroup aria-label="Movement" value={value} onValueChange={setValue}
      options={[{ value: 'soft', label: 'Soft' }, { value: 'wobbly', label: 'Wobbly' }]} />
    <JellyButton onClick={() => setValue('soft')}>Reset</JellyButton>
  </JellySurface>;
}
```

## Core exports

`JellyButton`, `JellyActivityButton`, `JellySelectionGroup`, `JellySurface`, `JellySlider`, `JellySwitch`, `JellyInput`, `JellyBadge`, `JellyAlert`, `JellySkeleton`, `JellyTabs`, `JellyDropdown`, `JellyCheckbox`, `JellyDialog`, `JellyTable`, `JellyWindow`, `JellyLink`.

Core also exports semantic tones, shared material/motion constants, bounded Spectral pigment helpers and their React hooks. It is ESM and server-renderable without Three. Types are included. The [API guide](https://github.com/globalanomalyindex/jellybox/blob/main/docs/COMPONENTS.md) and declarations describe props/native behaviors.

Controls forward the documented native refs/props. Give every input a label and every selection group/tablist an accessible name. Native semantic state and checks update independently of decorative travel. Use `action`, `info`, `success`, `warning`, `danger`, `neutral`; live alert urgency is explicit, never inferred from color.

`JellySlider animateTrack` is opt-in (default false). It emits intermediate accepted settings through the real callback for deliberate track clicks; drag/scrub/keys remain direct. Disable it where a consumer needs one immediate transactional update. The site's deliberate input feedback remains available when ambient breathing is paused; reduced motion snaps spatial travel.

## Optional optical scene

```jsx
import { JellyScene } from '@jellybox/react/renderer';

<JellyScene params={{ motion: .48, transmission: .06, light: .25 }}>
  <Example />
</JellyScene>
```

One scene measures one main window, up to 32 visible registered surfaces and two selection groups. CSS/SVG remains for overflow or unavailable WebGL. `defer` releases graphics resources outside the viewport while retaining child state. Leave room around a scene for casts. Do not create a context for each control.

Registered controls share physical material, stable identity and bounded caches. A dropdown uses one neutral shell and a moving dense blue focus pocket, while selection checks stay immediate. Renderer resources are disposed on unmount. The public `createOptics` controller is a low-level experimental adapter; application-specific tab/folder composition remains in the study source.

Styles use `.jb-*` and `--jb-*`. Override tokens locally on a wrapper. Import only the core for controls without optics. `createJellyPalette` caches 33 samples by default; `sample` returns hex and `sampleRGB` returns display sRGB. It supplies pigment-inspired color interpolation, not real transparent light transport.

## Limits and license

The optional renderer is an authored real-time approximation, not a validated fluid/path-traced simulation. Native semantics/focus and preference handling are implemented, but your composition still needs rendered contrast, keyboard/device and assistive-technology checks. Performance depends on hardware and scene size.

MIT. Spectral.js 3.0.0 attribution is in THIRD_PARTY_NOTICES.md. The package contains no JellyBox brand artwork, commercial font, site screenshots or development scratch files.


### Activity and readable ink

`JellyActivityButton` accepts an application-owned `status` (`idle`, `loading`, `success`, `warning`, `error`) and optional `progress` from 0–100. Loading uses native busy/disabled semantics. Both modes circulate through the whole material; supplied progress remains explicit in the label and the host’s progress rail. Completion gathers the current into a lasting thicker result crown, with moving density ridges and a small material recoil. Highlights, refraction and the contact cast follow the gathered contour while native text and target stay anchored. The component never starts a timer or invents success. Give failures a working retry callback. The story's timed task is explicitly a simulation.

`JellyScene` uses one stable reading intent (`--jb-reading-ink`) with the same CSS skin and optical material. Transmitting controls use black. A custom intentionally dark skin can explicitly choose white; lighting never recolors the letters. The whole volume’s front is a thinner, quieter reading film while its shoulders stay dense and colored. There is no label-shaped backing, outline or text shadow.

Nine framebuffer samples within the actual lettering bounds verify that intent, in one fixed asynchronous atlas: ordinary labels at10Hz, up to eight circulating/settling labels at30Hz, one readback pending. `chooseJellyInk(samples, previous, { preferred })` reports the actual worst ratio for the intended ink, including failures. Without an explicit preference it chooses black when it passes, otherwise the stronger candidate. Custom `createOptics` hosts supply `contrastTargets[].ink` and `onContrast`. Forced colors use system ink. These bounded samples are not exhaustive pixel or WCAG certification.
