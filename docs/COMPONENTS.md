# JellyBox components

The 0.5.16 foundation contains seventeen components. Core components work with React and the scoped stylesheet; the optional Three renderer supplies the liquid material. Forms, focus, text and selected state remain DOM behavior. This is an initial foundation, not a complete component suite or broad accessibility certification.

```jsx
import {
  JellyTabs, JellyDropdown, JellyCheckbox, JellyDialog, JellyTable,
} from '@jellybox/react';
import '@jellybox/react/styles.css';
```

The core controls share six semantic `tone` roles and material/motion tokens. JellyActivityButton adds application-owned activity/outcome states; the expanded contracts below cover the larger controls. Labels and state update immediately, independently of decorative motion.

Explicit `pigment` stays visible at rest: its quieter Spectral concentration gathers on hover and reaches the exact accent for selection/press. Disabled controls remain neutral. Actions without an explicit pigment keep their neutral resting appearance; semantic success, warning and danger retain their established tint. The shared `controlPigment` rule serves the native fallback and optional renderer.

## Shared window pigment

`JellyMaterialProvider` supplies an optional `pigment` (CSS hex color) to descendant ordinary controls, including sliders, dropdowns and selection groups. Their existing 480 ms Spectral responses follow that target. An explicit button pigment wins; `success`, `warning` and `danger` keep their semantic colors. A nested provider without a pigment restores the unscoped palette. It adds no DOM wrapper and works in core-only consumers.

```jsx
<JellyMaterialProvider pigment={windowColor}>
  <JellySlider label="Thickness" value={thickness} onValueChange={setThickness} />
  <JellyDropdown label="Shape" options={shapes} value={shape} onValueChange={setShape} />
  <JellyButton tone="success">Save</JellyButton>
</JellyMaterialProvider>
```

The provider carries the target, not an already-animated sample. Each existing material response remains its single owner; the renderer consumes displayed control samples and reads selection targets at their decorative handoff.

## JellyTabs

`items` is an array of `{ value, label, content, disabled?, tone? }`. Values are unique strings or numbers; labels and content accept React nodes.

| Prop | Contract |
| --- | --- |
| `value`, `onValueChange` | Controlled selection. The callback preserves the option's string/number type. |
| `defaultValue` | Uncontrolled initial selection; otherwise the first enabled item opens. |
| `orientation` | `horizontal` by default, or `vertical`. |
| `disabled`, `tone` | Disable the entire tablist; default tone is `action`. Individual items can override tone or be disabled. |
| `aria-label` / `aria-labelledby` | Name the tablist. |
| `id`, `className`, `style`, div attributes | Applied to the root. The forwarded ref is an `HTMLDivElement`. |

The tablist has one roving tab stop. Left/Right navigate horizontal tabs; Up/Down navigate vertical tabs. Navigation wraps past disabled tabs; Home/End choose the first/last enabled tab. Receiving focus activates the panel immediately, and native Enter/Space activates the button. Horizontal tabs leave Up/Down available for browser scrolling. Every tab names its panel through `aria-controls`; every panel names its tab through `aria-labelledby`. Inactive panels use `hidden` and remain mounted, preserving their form values and component state. The reveal moves content only a few pixels and changes opacity; it does not scale text. See the [WAI tabs pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

```jsx
<JellyTabs aria-label="Project settings" defaultValue="profile" items={[
  { value: 'profile', label: 'Profile', content: <ProfileForm /> },
  { value: 'preferences', label: 'Preferences', content: <PreferencesForm /> },
]} />
```

Tabs and radio groups share one decorative `SelectionContour`, with stable `data-gel-group` and option/key hooks. Semantic selection changes immediately. The CSS/SVG and optional WebGL paths use the same pure sampled sink/reassimilation model: the current border recedes, its anchor changes while submerged, and material rises around the new choice. A quick reversal keeps the current depth and depth velocity; text does not travel with the boundary.

`useJellyTransition(targetKey, { onFrame?, onAssimilated?, reducedMotion? })` exposes that model for other decorative surfaces. Its React state changes at phase/key boundaries; use `onFrame(snapshot)` or `getSnapshot()` for current depth, density and color progress without rendering React on every frame. `onAssimilated(key)` reports the decorative anchor change. Keep semantic content and values tied to the target immediately, rather than waiting for that callback.

## JellyDropdown

`options` is an array of `{ value, label, description?, disabled?, tone? }`. `label` is a string for native option names and typeahead; descriptions accept React nodes. Keep values unique after native string serialization.

| Prop | Contract |
| --- | --- |
| `label`, `options` | Required visible label and choices. |
| `value`, `onValueChange` | Controlled selection; callback returns the original typed option value. |
| `defaultValue` | Uncontrolled initial selection. Without a selection, the placeholder is shown. |
| `placeholder` | Defaults to `Choose an option`. |
| `description`, `error` | Associated help and error content. An error sets `aria-invalid`. |
| `name`, `form`, `required`, `disabled` | Native submission, form association, validation and disabled behavior. |
| `tone` | Defaults to `info`; the popup has one shared focus pigment; per-option tone is retained only for compatibility. |
| `nativeRef`, `onInvalid` | Access to the hidden `HTMLSelectElement` and its invalid event. |
| Button attributes, `className`, `style` | The forwarded ref points to the visible `HTMLButtonElement` trigger. |

The visible trigger is a select-only combobox controlling a designed listbox. Focus stays on the trigger; `aria-activedescendant` identifies the active option. Arrows move through enabled options, Home/End jump, and typed characters search labels. Enter/Space commit. Escape closes; Tab exits normally; outside pointer/focus closes. Pointer selection restores trigger focus. The popup is placed in the component's DOM, so it stays inside a native dialog's top layer; it is not portaled to the document body. Options contain no interactive descendants. See the [WAI listbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/).

A visually hidden native select carries the actual form value and `required` validity. Invalid submission focuses the visible trigger and reveals an error. Uncontrolled form reset restores the native default and visible value. Controlled values remain the caller's responsibility; a reset reasserts the current controlled value without firing a change callback.

```jsx
<JellyDropdown label="Material" name="material" required defaultValue="dense"
  options={[
    { value: 'dense', label: 'Dense', description: 'A stronger boundary' },
    { value: 'clear', label: 'Clear', description: 'More transmitted light' },
  ]} />
```

## JellyCheckbox

The forwarded ref is the native `HTMLInputElement`. Native attributes such as `name`, `value`, `form`, `required`, `disabled`, `id` and `onChange` pass through.

| Prop | Contract |
| --- | --- |
| `label`, `description`, `error` | Visible copy with associated help/error IDs. |
| `checked`, `onCheckedChange` | Controlled boolean state; the callback receives a boolean. |
| `defaultChecked` | Uncontrolled initial state, false by default. Native reset restores it. |
| `indeterminate` | Authored mixed state, applied to the native property and `aria-checked="mixed"`. Clear this prop in the parent when accepting a user choice. |
| `tone` | Defaults to `action`; error uses `danger`. |
| `optical` | True by default; false keeps the CSS material without registering an optical lens; tables now register their visible checkboxes by default. |

The material box is 28px inside a 44 px native hit area. A frosted face keeps its mark sharp. Space and native label activation toggle the checkbox; checked values use normal form submission. Mixed state is a semantic status, not a separate submitted value. See the [WAI checkbox pattern](https://www.w3.org/WAI/ARIA/apg/patterns/checkbox/).

```jsx
<JellyCheckbox label="Send updates" name="updates" value="enabled"
  defaultChecked description="You can change this later." />
```

## JellyDialog

| Prop | Contract |
| --- | --- |
| `open`, `onOpenChange` | Required controlled modal state. Close and Escape request `false`. |
| `title`, `description` | Required title and optional associated description. |
| `children`, `footer` | Body and optional action region. |
| `initialFocusRef` | Optional element inside the dialog to focus on opening. |
| `closeLabel` | Defaults to `Close dialog`. |
| `renderSurface` | Optional `(content) => ReactNode` wrapper for an optical JellyScene/JellySurface. |
| `tone`, `className`, `style` | Material role and local presentation. Ref points to `HTMLDialogElement`. |

This is a native `showModal()` dialog, separate from the study's nonmodal disclosures. The browser supplies modal focus containment and an inert background. Closing releases the top layer and restores focus. Opening/closing use the shared material/fade timing; interrupted reopening continues from the current presentation. Reduced motion finishes immediately. Children remain mounted while closed. A dropdown inside the dialog keeps its popup there; its first Escape closes the popup, with a later Escape requesting dialog closure.

The optional optical scene's opaque paper receiver is clipped to the dialog's rounded window. Inner material lighting is 3D; the outer contact cast is composited in CSS. This is a practical raster-compositing limit, not unrestricted transparent optics across the browser top layer.

```jsx
const [open, setOpen] = useState(false);

<>
  <JellyButton onClick={() => setOpen(true)}>Edit settings</JellyButton>
  <JellyDialog open={open} onOpenChange={setOpen} title="Settings">
    <SettingsForm />
  </JellyDialog>
</>
```

## JellyTable

`columns` are `{ key, header, render?, sortable?, align? }`. `render(value, row, index)` accepts custom cell content; `align` is left, center or right. Rows are objects accessed by column key.

| Prop | Contract |
| --- | --- |
| `columns`, `rows`, `caption` | Required column definitions, row data and native table caption. |
| `sort`, `onSortChange` | `{ key, direction: 'asc' | 'desc' }`, or null. Omit `sort` for local sorting; supplying `sort` means the caller supplies rows in the requested order. |
| `selectedKeys`, `onSelectionChange` | Controlled row selection or callback-enabled local selection. |
| `getRowId`, `getRowLabel` | Stable identity and accessible checkbox label. Selection requires unique string/number row IDs, from `row.id` or `getRowId`. |
| `isRowDisabled` | Disable selection for a row. |
| `loading`, `emptyMessage` | Busy/loading state or an empty row. |
| `tone`, `className`, `style` | Material and wrapper styling. Ref points to the native `HTMLTableElement`. |

Headers use `scope="col"`; sorted headers expose `aria-sort` and a native sort button. Local sorting is stable and compares numeric, date or string field values. Select-all acts on enabled rows on the current page; its mixed checkbox indicates partial selection and retains selected keys outside the page. Loading disables selection and sorting while a status announces it. The table sits in a named, keyboard-focusable scrolling region; it retains native table semantics rather than implementing an ARIA grid.

```jsx
<JellyTable caption="Materials" rows={rows}
  columns={[
    { key: 'name', header: 'Name', sortable: true },
    { key: 'status', header: 'Status' },
  ]}
  selectedKeys={selectedKeys} onSelectionChange={setSelectedKeys} />
```

## A working native-form workflow

```jsx
import { useState } from 'react';
import { JellyDropdown, JellyCheckbox, JellyButton, JellyAlert } from '@jellybox/react';
import '@jellybox/react/styles.css';

function SettingsForm() {
  const [saved, setSaved] = useState(null);
  return <form onReset={() => setSaved(null)} onSubmit={(event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaved({ material: data.get('material'), updates: data.has('updates') });
  }}>
    <JellyDropdown label="Material" name="material" defaultValue="dense" required
      options={[{ value: 'dense', label: 'Dense' }, { value: 'clear', label: 'Clear' }]} />
    <JellyCheckbox label="Send updates" name="updates" defaultChecked />
    <JellyButton type="submit">Save</JellyButton>
    <JellyButton type="reset" tone="neutral">Reset</JellyButton>
    {saved && <JellyAlert tone="success" live="polite">Saved {saved.material}; updates {saved.updates ? 'on' : 'off'}.</JellyAlert>}
  </form>;
}
```

Use uncontrolled defaults when native reset should restore initial values automatically. For controlled forms, update the application's state in `onReset`. Optics never own submission or state. Six semantic roles, visible focus, native behavior and these targeted contracts still require composition-specific contrast and assistive-technology testing.

## JellyWindow and useJellyWindow

`JellyWindow` owns one persistent `JellySurface`. Supply `viewKey` and a render function; the old reading content becomes inert while its rim sinks, and the function receives the next visible key only at full assimilation. Content fades without translation or scaling. Selection/navigation state belongs to the caller and changes immediately. Rapid reversals preserve depth and velocity. `reducedMotion` or the OS preference snaps; first mounting is immediate. Store form state above the window if it must persist when a view unmounts (JellyTabs separately preserves its mounted panels).

```jsx
<JellyScene tone="info">
  <JellyWindow tone="info" viewKey={view}>
    {visibleView => views[visibleView]}
  </JellyWindow>
</JellyScene>
```

Props: `viewKey`, `children` (node or visible-key render function), `tone`, `reducedMotion`, `onFrame`, and native div attributes/ref. A plain node has no cached view identity; use the render function when changing content.

`useJellyWindow(viewKey, { surfaceRef, contentRef, reducedMotion, onFrame })` composes the same transition into an existing container. Its callback adds `contentOpacity`, `rimScale`, `gapScale` and `attenuationScale` to the transition snapshot; its return follows `useJellyTransition`. Surface data hooks supply depth to the optional renderer, and CSS variables supply the fallback. The film persists while rim height falls to 16% and elevation to 18%; attenuation distance increases as density recedes. The optional renderer continuously follows new surface dimensions. This is an authored depth treatment, not physical volume conservation.

## JellyLink

Native anchor with the library's button material and face. Accepts normal anchor props/ref, `tone`, and `size`. Use it for navigation/downloads; use JellyButton for actions. The study consumes these shared primitives rather than local lookalikes.

## Shared material skin

Badge, Alert, Dropdown menu, Table, Skeleton and controls share material-skin.css. Status pills remain noninteractive, with stable frosted reading support inside a colored meniscus. Tables retain readable tinted rows and an enclosing dense perimeter; row selection increases boundary density. Inside JellyScene, badges, dropdown menus/options, table frames/rows and their controls register actual physical-material geometry. Only successful claims lose DOM background paint. Text remains above the scene, with local frosted support. Popup rendering is projected into the popup stacking layer from the same WebGL frame; no extra WebGL context or photon pass is created. CSS uses the canonical 120ms feedback, 240 ms material and exact slight spatial curve; opacity uses monotonic easing and reduced motion removes deformation.


### Rendered surface budget (0.4.0)

A scene retains up to 32 visible surfaces and two selection contours. Menu surfaces take priority; off-screen and fully clipped nodes do not consume slots. Stable DOM identities preserve pigment/depth history when sorting and filtering. Scroll clipping uses the original geometry and world-space clipping planes, so a partially hidden badge does not grow a new rounded end. Surfaces beyond the budget retain CSS. Passive badges breathe gently but never show actionable hover/press feedback.

The same MeshPhysicalMaterial, directional light, environment, Spectral pigment palette and translucency/light parameters serve all these roles. Their proportions differ deliberately: a row is shallower than an action, a badge is compact, and a table/menu perimeter carries greater thickness. Child casts use bounded analytic transmitted-light footprints derived from tint, thickness, absorption and the shared light direction; they are not additional path-traced caustics. Popup projection has no HTML texture sampling/refraction. Core imports still work without Three or WebGL; forced colors disables the decorative canvas.


## JellyActivityButton and ink

```jsx
<JellyActivityButton status={job.status} progress={job.percent} onClick={generateOrRetry} />
```

`status` is `idle | loading | success | warning | error`. `progress` is optional and bounded to 0–100; omit it for indeterminate work. Labels/icons and semantic tone follow the state, `loading` sets `aria-busy` and disables activation, and the application owns completion, cancellation and retry. The shared renderer supplies full-capsule blue activity for both known and unknown progress, with bounded mesh movement, optical normals, thickness and absorption following its current. Outcomes gather that displayed mass into a persistent thicker crown. Unequal current lobes continue rotating as density ridges travel inward; the material narrows and swells, and the contact cast follows the same contour. Dense result pigment leads the thinner film within the one host phase, so the outcome collects through the moving volume instead of changing every point together. Pigment keeps its shared phase while the spatial response settles; retry and cancellation retain displayed continuity. Busy is active work, not neutral disabled paint. The icon and label have fixed slots. Paused/reduced motion preserves state/progress without continuous travel. Children replace the default label; native button attributes and ref pass through. With an identical custom pigment for loading and result, the color hook has no color travel and publishes phase1, so density reaches its endpoint immediately while the localized shoulder release still runs. Built-in semantic pigments retain the full shared-phase gather; a custom optical host can supply its own activityPhase when reusing one pigment across states.

`chooseJellyInk(samples, previous?, { preferred }?)` accepts display hex colors or relative luminances and returns `{ ink, ratio, halo }`. `JELLY_INK` defines dark/light ink and the 4.5:1 sampled target. `JellyScene` binds a stable reading intent from `--jb-reading-ink` (black by default for transmitting skins). Its whole optical front becomes a thinner, quieter reading film within the same contour; dense shoulders retain the pigment. Explicit white is reserved for an intentionally dark host skin. Samples verify the intended ink instead of flipping it as highlights move. Without an explicit intent, the helper prefers black whenever it passes. The `previous` argument remains source-compatible but no longer preserves unnecessary white lettering. It removes extra HTML reading faces on sampled surfaces so their contrast is evaluated against the actual visible material. Lettering uses solid true-black/white ink without an outline, text shadow or backing. The compatibility `halo` result is deprecated and always false; inspect `ratio` for the actual sampled contrast, including mixed samples below the target. Custom compositions and assistive technology still need validation.

The optional renderer accepts `OpticalBody.density.concentration` in the bounded .3–1 range, `contact` for compact reading-area casts, `activity`/`progress`, an optional already-eased `activityPhase` for shared-clock gathering, and an opaque hex `activityColor` destination for the internal pigment (automatically supplied by `JellyScene`). With that destination, two cached Spectral paths carry film and current on the same phase. Omit it for a cheap displayed-body tint/loading-blue fallback. `MOTION.activitySettle` is the720ms localized spatial finish. An optional stable `lightAnchor` keeps culling from changing point-light normalization. `contrastTargets` and `onContrast` expose batched readings to custom hosts. Supply each target’s exact `ink` (`#000000` or `#ffffff`) from its independent reading intent; omit it for black. Readback failures report ratio0 and never claim a pass. `reactive` targets receive bounded 30 Hz priority during circulation and material settling; ordinary targets remain at 10 Hz. These are experimental renderer contracts.

Slider pointer hover is limited to the current rounded bulb and numeric value bubble. The rail, label and row gaps stay quiet; their native click/drag and label-focus behavior remain available. The slider owns its optical hover/press metadata in both the study and optional scene, with canonical exit grace and material settling. Keyboard-visible focus and active gestures remain deliberate engagement. Thumb assistance begins only within its pointer hover zone. Accepted value travel rechecks that same geometry if the bulb moves beneath a stationary pointer.

Compact slider thumbs, value bubbles and option surfaces share an interior density shoulder when claimed by optics. `JELLY_MATERIAL.control.densityShoulder` exposes its authored span, relief, state gains, absorption and small-thumb path bounds. No new component props or state ownership are required. CSS-only consumers receive a broad shaded approximation and native value-button chrome reset. Selected checks and keyboard/forced-color indicators retain their native purpose; custom colors and compositions still need rendered checks.

The optional `OpticalDensity.hover` input keeps its existing boolean contract. Folder approach now gathers a local shoulder instead of globally tinting the reading plateau. Height, normals, concentration and receiver light share the field and cached pigment rows; no extra host timing or component props are required. The optional `OpticalDensity.childActive` boolean marks enabled child hover, focus or gesture ownership, separate from raw `hover`. The study uses that distinction to melt parent gathering over420ms to a faint12% breathing shoulder and gather invitation over280ms on return; true exit still reaches zero. Its existing response also brakes the retained current angle. Structural density stays unchanged; omitting the new field preserves ordinary invitation/exit semantics. Compound sliders supply their existing engagement/drag state; native hit targets and focus remain unchanged. The same native204×44px handle toggles the group. CSS fallback follows the same child priority with a neutral center and deeper inset shading.


`OpticalDensity.transferTarget?: OpticalRect & { id: string }` identifies the actual registered receiving surface in the same scene coordinates as the density region. Hosts should supply enabled visible hover, keyboard-visible focus or captured gesture ownership, rather than pointer-only retained focus. Its stable ID must match an existing bubble; the fixed target rect is independent of material assistance. Omit/null it to return the concentration to the folder. Same-ID bound updates follow a moving thumb without restarting; retargeting captures the displayed packet and receiver shares. Contextual `childActive` remains independent. Existing consumers that omit the target retain ordinary folder attention. The renderer bounds the traveling packet and donor relief and gathers into the existing child shoulder; this is an authored visual transfer, not validated fluid conservation. Core CSS controls remain usable without the spatial renderer.
