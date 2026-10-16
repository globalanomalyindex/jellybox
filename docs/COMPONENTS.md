# JellyBox components

The 0.5.0 foundation contains seventeen components. Core components work with React and the scoped stylesheet; the optional Three renderer supplies the liquid material. Forms, focus, text and selected state remain DOM behavior. This is an initial foundation, not a complete component suite or broad accessibility certification.

```jsx
import {
  JellyTabs, JellyDropdown, JellyCheckbox, JellyDialog, JellyTable,
} from '@jellybox/react';
import '@jellybox/react/styles.css';
```

The core controls share six semantic `tone` roles and material/motion tokens. JellyActivityButton adds application-owned activity/outcome states; the expanded contracts below cover the larger controls. Labels and state update immediately, independently of decorative motion.

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

`status` is `idle | loading | success | warning | error`. `progress` is optional and bounded to 0–100; omit it for indeterminate work. Labels/icons and semantic tone follow the state, `loading` sets `aria-busy` and disables activation, and the application owns completion, cancellation and retry. The shared renderer supplies a circulating or gathering pigment pocket. Paused/reduced motion preserves state/progress without continuous travel. Children replace the default label; native button attributes and ref pass through.

`chooseJellyInk(samples, previous?)` accepts display hex colors or relative luminances and returns `{ ink, ratio, halo }`. `JELLY_INK` defines dark/light ink and the 4.5:1 sampled target. `JellyScene` automatically uses the rendered-background sampling policy. It removes extra HTML reading faces on sampled surfaces so their contrast is evaluated against the actual visible material. Mixed samples that cannot support one ink receive a narrow opposing glyph halo. Custom compositions and assistive technology still need validation.

The optional renderer accepts `OpticalBody.density.concentration` in the bounded .3–1 range, `contact` for compact reading-area casts, `activity`/`progress`, and an optional stable `lightAnchor` so culling does not change point-light normalization. `contrastTargets` and `onContrast` expose batched readings to custom hosts. These are experimental renderer contracts.
