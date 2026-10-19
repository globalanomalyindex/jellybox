import * as React from 'react';

export type JellyTone = 'action' | 'info' | 'success' | 'warning' | 'danger' | 'neutral';
export interface JellyMaterialProviderProps { pigment?: string; children?: React.ReactNode; }
export function JellyMaterialProvider(props: JellyMaterialProviderProps): React.ReactElement;

export type JellySize = 'sm' | 'md' | 'lg';
export interface SemanticColor { readonly label: string; readonly hex: string; readonly ink: string; readonly rgb: readonly [number, number, number]; readonly description: string; }
export const SEMANTIC_COLORS: Readonly<Record<JellyTone, SemanticColor>>;
export const JELLY_TOKENS: Readonly<{ font: string; ink: string; controlInk: string; focus: string; frostedFace: string; frostBlur: string; radius: Readonly<{ control: string; surface: string; input: string }>; spacing: readonly number[] }>;
export interface MaterialParams { motion: number; transmission: number; light: number; depth?: number; lift?: number; prism?: number; }
export const DEFAULT_MATERIAL: Readonly<MaterialParams>;
export const JELLY_MATERIAL: Readonly<{ window: Readonly<{ filmHalfDepth: number; rimHalfDepth: number; rimSpan: number; gap: number }>; control: Readonly<{ filmHalfDepth: number; rimHalfDepth: number; rimSpan: number; attenuationDense: number; attenuationClear: number; selectedDensity: number; selectedTintAbsorption: number; selectedLift: number; densityShoulder: Readonly<{ minimumSpan: number; maximumSpan: number; relief: number; rest: number; hover: number; selected: number; maximum: number; absorption: number; smallControlPath: number; smallControlFullSpan: number; smallControlSpan: number }> }> }>;
export const MOTION: Readonly<{
  expand: number; collapse: number; flow: number; material: number; feedback: number; compress: number; fade: number; follow: number;
  breathe: number; activityOrbit: number; activitySettle: number;
  activityResponse: Readonly<{ frequency: number; damping: number }>; activityStrain: Readonly<{ frequency: number; damping: number }>;
  skeleton: number; loadingPreview: number; recoil: number; pigment: number; tabTransfer: number;
  windowOpen: number; windowClose: number; densityGather: number; densityMelt: number;
  sliderGather: number; sliderMelt: number; sliderGrace: number; sliderTravel: number; magnetRise: number;
  arrival: number; arrivalStagger: number;
  sliderTravelCurve: string; gather: string; withdraw: string; pigmentCurve: string;
  spring: string; squeeze: string; recoilCurve: string; settle: string; effects: string;
}>;

export interface JellyButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: JellyTone; size?: JellySize; variant?: 'solid' | 'soft' | 'ghost' | 'quiet'; loading?: boolean; selected?: boolean; highlighted?: boolean; pigment?: string;
}
export const JellyButton: React.ForwardRefExoticComponent<JellyButtonProps & React.RefAttributes<HTMLButtonElement>>;
export type JellyActivityStatus = 'idle' | 'loading' | 'success' | 'warning' | 'error';
export interface JellyActivityButtonProps extends Omit<JellyButtonProps, 'tone' | 'loading' | 'selected'> { status?: JellyActivityStatus; progress?: number; }
export const JellyActivityButton: React.ForwardRefExoticComponent<JellyActivityButtonProps & React.RefAttributes<HTMLButtonElement>>;
export const JELLY_INK: Readonly<{ dark: string; light: string; minimum: number }>;
export function contrastRatio(first: number, second: number): number;
export interface JellyInkResult { ink: string; ratio: number; /** @deprecated Lettering has no outline; always false. */ halo: boolean; }
export interface JellyInkOptions {
  /** Intended solid ink. Samples still report their actual worst contrast ratio. */
  preferred?: string;
}
export function chooseJellyInk(samples: readonly (number | string)[], previous?: string, options?: JellyInkOptions): JellyInkResult;
export interface JellySurfaceProps extends React.HTMLAttributes<HTMLDivElement> { tone?: JellyTone; }
export const JellySurface: React.ForwardRefExoticComponent<JellySurfaceProps & React.RefAttributes<HTMLDivElement>>;

export type JellySelectionValue = string | number;
export interface JellySelectionOption<Value extends JellySelectionValue = JellySelectionValue> {
  value: Value; label: React.ReactNode; description?: React.ReactNode; disabled?: boolean; tone?: JellyTone; content?: React.ReactNode;
  render?: React.ReactNode | ((state: { option: JellySelectionOption<Value>; selected: boolean; disabled: boolean }) => React.ReactNode);
}
export interface JellySelectionGroupProps<Value extends JellySelectionValue = JellySelectionValue> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  value: Value; onValueChange?: (value: Value) => void; options: readonly JellySelectionOption<Value>[];
  tone?: JellyTone; size?: JellySize; orientation?: 'horizontal' | 'vertical'; disabled?: boolean; name?: string;
  /** Manual mode uses a toolbar: arrows preview on focus, Enter/Space commit. */
  activation?: 'automatic' | 'manual';
}
export function JellySelectionGroup<Value extends JellySelectionValue>(props: JellySelectionGroupProps<Value> & React.RefAttributes<HTMLDivElement>): React.ReactElement;

export interface JellySliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'min' | 'max' | 'step' | 'size'> {
  label: React.ReactNode; description?: React.ReactNode; tone?: JellyTone; compact?: boolean; value?: number; defaultValue?: number;
  /** Opt-in 240ms rail-click travel; callbacks receive each actual stepped value. Dragging and keys stay immediate. */
  animateTrack?: boolean;
  min?: number; max?: number; step?: number | 'any'; onValueChange?: (value: number) => void; formatValue?: (value: number) => React.ReactNode;
}
export const JellySlider: React.ForwardRefExoticComponent<JellySliderProps & React.RefAttributes<HTMLInputElement>>;
export interface JellySwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: React.ReactNode; description?: React.ReactNode; tone?: JellyTone; onCheckedChange?: (checked: boolean) => void;
}
export const JellySwitch: React.ForwardRefExoticComponent<JellySwitchProps & React.RefAttributes<HTMLInputElement>>;
export interface JellyInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: React.ReactNode; description?: React.ReactNode; error?: React.ReactNode; tone?: JellyTone;
}
export const JellyInput: React.ForwardRefExoticComponent<JellyInputProps & React.RefAttributes<HTMLInputElement>>;
export interface JellyBadgeProps extends React.HTMLAttributes<HTMLSpanElement> { tone?: JellyTone; }
export const JellyBadge: React.ForwardRefExoticComponent<JellyBadgeProps & React.RefAttributes<HTMLSpanElement>>;
export interface JellyAlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  tone?: JellyTone; title?: React.ReactNode; live?: 'off' | 'polite' | 'assertive'; dismissible?: boolean; onDismiss?: () => void; dismissLabel?: string;
}
export const JellyAlert: React.ForwardRefExoticComponent<JellyAlertProps & React.RefAttributes<HTMLDivElement>>;
export interface JellySkeletonProps extends React.HTMLAttributes<HTMLDivElement> { lines?: number; label?: string; animated?: boolean; }
export const JellySkeleton: React.ForwardRefExoticComponent<JellySkeletonProps & React.RefAttributes<HTMLDivElement>>;

/** JellyScene is available only from @jellybox/react/renderer. */
export interface JellySceneProps extends Pick<React.HTMLAttributes<HTMLDivElement>, 'children' | 'className' | 'style'> { params?: Partial<MaterialParams>; tone?: JellyTone; active?: boolean; defer?: boolean; }

export interface JellyTabItem<Value extends JellySelectionValue = JellySelectionValue> {
  value: Value; label: React.ReactNode; content: React.ReactNode; disabled?: boolean; tone?: JellyTone;
}
export interface JellyTabsProps<Value extends JellySelectionValue = JellySelectionValue> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> {
  items: readonly JellyTabItem<Value>[]; value?: Value; defaultValue?: Value; onValueChange?: (value: Value) => void;
  orientation?: 'horizontal' | 'vertical'; disabled?: boolean; tone?: JellyTone;
}
export function JellyTabs<Value extends JellySelectionValue>(props: JellyTabsProps<Value> & React.RefAttributes<HTMLDivElement>): React.ReactElement;
export interface JellyDropdownOption<Value extends JellySelectionValue = JellySelectionValue> {
  value: Value; label: string; description?: React.ReactNode; disabled?: boolean;
  /** @deprecated Options share the dropdown’s focus pigment. Use the dropdown tone prop. */
  tone?: JellyTone;
}
export interface JellyDropdownProps<Value extends JellySelectionValue = JellySelectionValue> extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'defaultValue' | 'onChange' | 'onInvalid'> {
  label: React.ReactNode; options: readonly JellyDropdownOption<Value>[]; value?: Value; defaultValue?: Value;
  onValueChange?: (value: Value) => void; placeholder?: string; description?: React.ReactNode; error?: React.ReactNode;
  required?: boolean; tone?: JellyTone; nativeRef?: React.Ref<HTMLSelectElement>; onInvalid?: React.FormEventHandler<HTMLSelectElement>;
}
export function JellyDropdown<Value extends JellySelectionValue>(props: JellyDropdownProps<Value> & React.RefAttributes<HTMLButtonElement>): React.ReactElement;
export interface JellyCheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label: React.ReactNode; description?: React.ReactNode; error?: React.ReactNode; optical?: boolean; indeterminate?: boolean; onCheckedChange?: (checked: boolean) => void; tone?: JellyTone;
}
export const JellyCheckbox: React.ForwardRefExoticComponent<JellyCheckboxProps & React.RefAttributes<HTMLInputElement>>;
export interface JellyDialogProps {
  open: boolean; onOpenChange: (open: boolean) => void; title: React.ReactNode; description?: React.ReactNode;
  children?: React.ReactNode; footer?: React.ReactNode; tone?: JellyTone; initialFocusRef?: React.RefObject<HTMLElement | null>;
  closeLabel?: string; renderSurface?: (content: React.ReactNode) => React.ReactNode; className?: string; style?: React.CSSProperties;
}
export const JellyDialog: React.ForwardRefExoticComponent<JellyDialogProps & React.RefAttributes<HTMLDialogElement>>;
export type JellyRowKey = string | number;
export interface JellyTableSort { key: string; direction: 'asc' | 'desc'; }
export interface JellyTableColumn<Row extends object> {
  key: string; header: React.ReactNode; render?: (value: unknown, row: Row, index: number) => React.ReactNode;
  sortable?: boolean; align?: 'left' | 'center' | 'right';
}
export interface JellyTableProps<Row extends object> {
  columns: readonly JellyTableColumn<Row>[]; rows: readonly Row[]; caption: React.ReactNode;
  getRowId?: (row: Row, index: number) => JellyRowKey; getRowLabel?: (row: Row, index: number) => string;
  isRowDisabled?: (row: Row) => boolean; sort?: JellyTableSort | null; onSortChange?: (sort: JellyTableSort) => void;
  selectedKeys?: readonly JellyRowKey[]; onSelectionChange?: (keys: JellyRowKey[]) => void;
  emptyMessage?: React.ReactNode; loading?: boolean; tone?: JellyTone; className?: string; style?: React.CSSProperties;
}
export function JellyTable<Row extends object>(props: JellyTableProps<Row> & React.RefAttributes<HTMLTableElement>): React.ReactElement;

export interface JellyColorOptions {
  duration?: number;
  disabled?: boolean;
  /** A new object seeds a surface handoff. Keep stable between handoffs. */
  origin?: { color: string };
}
export function mixJellyColors(from: string, to: string, progress: number): string;
export interface JellyPalette { readonly from: string; readonly to: string; readonly steps: number; readonly colors: readonly string[]; sample(progress: number): string; sampleRGB(progress: number, out?: [number, number, number]): [number, number, number]; }
/** Opaque hex colors; pigment-inspired mixing for decorative material only. */
export function createJellyPalette(from: string, to: string, steps?: number): JellyPalette;
export function useJellyColor(target: string, options?: JellyColorOptions): string;
export function useJellyToneStyle(tone?: JellyTone, options?: JellyColorOptions): React.CSSProperties;

export interface JellyTransitionSnapshot<Key = string> {
  phase: 'idle' | 'sink' | 'rise'; depth: number; density: number; colorProgress: number;
  visibleKey: Key; targetKey: Key; submerged: boolean;
}
export interface JellyTransitionOptions<Key> {
  onFrame?: (snapshot: JellyTransitionSnapshot<Key>) => void;
  onAssimilated?: (key: Key) => void; reducedMotion?: boolean;
}
/** React updates at phase boundaries. Use onFrame/getSnapshot for decorative frame values. */
export function useJellyTransition<Key extends string | number>(targetKey: Key, options?: JellyTransitionOptions<Key>): Pick<JellyTransitionSnapshot<Key>, 'phase' | 'visibleKey' | 'targetKey'> & { getSnapshot(): JellyTransitionSnapshot<Key> };

export interface JellyLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> { tone?: JellyTone; size?: JellySize; }
export const JellyLink: React.ForwardRefExoticComponent<JellyLinkProps & React.RefAttributes<HTMLAnchorElement>>;
export interface JellyWindowOptions<Key> { surfaceRef?: React.RefObject<HTMLElement | null>; contentRef?: React.RefObject<HTMLElement | null>; reducedMotion?: boolean; onFrame?: (frame: JellyTransitionSnapshot<Key> & { contentOpacity: number; rimScale: number; gapScale: number; attenuationScale: number }) => void; }
export function useJellyWindow<Key extends string | number | null>(viewKey: Key, options?: JellyWindowOptions<Key>): Pick<JellyTransitionSnapshot<Key>, 'phase' | 'visibleKey' | 'targetKey'> & { getSnapshot(): JellyTransitionSnapshot<Key> };
export interface JellyWindowProps<Key> extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> { viewKey: Key; children: React.ReactNode | ((visibleKey: Key) => React.ReactNode); tone?: JellyTone; reducedMotion?: boolean; onFrame?: JellyWindowOptions<Key>['onFrame']; }
export function JellyWindow<Key extends string | number>(props: JellyWindowProps<Key> & React.RefAttributes<HTMLDivElement>): React.ReactElement;
