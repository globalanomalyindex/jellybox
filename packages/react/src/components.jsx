import { advanceScrub } from './interaction.js';
import { useSliderTravel } from './useSliderTravel.js';
import { forwardRef, useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MOTION } from './renderer/motion.js';
import { toneStyle } from './tokens.js';
import { useJellyToneStyle, useJellyControlStyle } from './useMaterialColor.js';
import { SelectionContour } from './SelectionContour.jsx';
import { selectionKeyIndex, selectionTabIndex } from './selection.js';

const cx = (...classes) => classes.filter(Boolean).join(' ');
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const ids = (...values) => values.filter(Boolean).join(' ') || undefined;
const assignRef = (ref, value) => { if (typeof ref === 'function') ref(value); else if (ref) ref.current = value; };
const uniqueId = (prefix, id, generated) => id || `${prefix}-${generated.replace(/:/g, '')}`;

export const JellyButton = forwardRef(function JellyButton({
  children, tone = 'action', size = 'md', variant = 'solid', loading = false, disabled = false,
  selected, highlighted, pigment, type = 'button', className, style, ...props
}, ref) {
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false), [pressed, setPressed] = useState(false);
  const node = useRef(null);
  const activity = props['data-gel-activity'];
  const setRef = useCallback(element => { node.current = element; assignRef(ref, element); }, [ref]);
  const sample = progress => {
    if (activity && node.current) {
      const value = String(progress);
      if (node.current.dataset.gelMaterialPhase !== value) node.current.dataset.gelMaterialPhase = value;
    }
  };
  const chosenValue = selected ?? props['aria-pressed'] ?? props['aria-expanded'];
  const chosen = chosenValue === true || chosenValue === 'true';
  const state = loading ? 'loading' : disabled ? 'disabled' : chosen || ['success', 'warning', 'error'].includes(activity) ? 'selected' : pressed ? 'pressed' : (highlighted ?? (hovered || focused)) ? 'highlighted' : 'rest';
  const material = useJellyControlStyle(variant === 'quiet' && state === 'rest' ? 'neutral' : tone, state, pigment, { onSample: sample });
  return <button {...props} ref={setRef} type={type} disabled={disabled || loading}
    aria-busy={loading || undefined} aria-pressed={selected ?? props['aria-pressed']}
    data-gel-surface="" data-gel-tone={tone} data-gel-state={state} data-gel-sampled="true"
    data-gel-hover={hovered || focused || undefined} data-gel-pressed={pressed || undefined}
    onPointerEnter={e => { setHovered(true); props.onPointerEnter?.(e); }}
    onPointerLeave={e => { setHovered(false); setPressed(false); props.onPointerLeave?.(e); }}
    onFocus={e => { setFocused(e.currentTarget.matches(':focus-visible')); props.onFocus?.(e); }}
    onBlur={e => { setFocused(false); setPressed(false); props.onBlur?.(e); }}
    onPointerDown={e => { setPressed(true); props.onPointerDown?.(e); }}
    onPointerUp={e => { setPressed(false); props.onPointerUp?.(e); }}
    onPointerCancel={e => { setPressed(false); props.onPointerCancel?.(e); }}
    className={cx('jb-button', `jb-size-${size}`, `jb-variant-${variant}`, loading && 'jb-loading', className)}
    style={{ ...material, ...style }}>
    <span className="jb-button-face">{loading && <span className="jb-spinner" aria-hidden="true" />}{children}</span>
  </button>;
});

export const JellyLink = forwardRef(function JellyLink({ children, tone = 'info', size = 'md', className, style, ...props }, ref) {
  return <a {...props} ref={ref} data-gel-surface="" data-gel-tone={tone}
    className={cx('jb-button', 'jb-link', `jb-size-${size}`, className)} style={{ ...useJellyToneStyle(tone), ...style }}>
    <span className="jb-button-face">{children}</span>
  </a>;
});

export const JellySurface = forwardRef(function JellySurface({ children, tone = 'info', className, style, ...props }, ref) {
  return <div {...props} ref={ref} data-gel-panel="" data-gel-tone={tone}
    className={cx('jb-surface', className)} style={{ ...useJellyToneStyle(tone), ...style }}>
    <div className="jb-surface-content">{children}</div>
  </div>;
});

const JellyOption = forwardRef(function JellyOption({ tone, chosen, disabled, children, ...props }, ref) {
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const state = disabled ? 'disabled' : chosen ? 'selected' : hovered || focused ? 'highlighted' : 'rest';
  const material = useJellyControlStyle(tone, state);
  return <button {...props} ref={ref} disabled={disabled} data-gel-state={state} data-gel-sampled="true" style={material}
    onPointerEnter={() => setHovered(true)} onPointerLeave={() => setHovered(false)}
    onFocus={e => { setFocused(e.currentTarget.matches(':focus-visible')); props.onFocus?.(e); }} onBlur={() => setFocused(false)}>{children}</button>;
});

export const JellySelectionGroup = forwardRef(function JellySelectionGroup({
  value, onValueChange, options, tone = 'action', size = 'md', orientation = 'horizontal', disabled = false,
  name, id, dir, activation = 'automatic', className, style, onKeyDown, ...props
}, ref) {
  const generated = useId();
  const groupId = uniqueId('jb-group', id, generated);
  const groupRef = useRef(null);
  const itemRefs = useRef([]);
  const [focusValue, setFocusValue] = useState(value);
  const manual = activation === 'manual';
  const tabIndex = selectionTabIndex(options, manual ? focusValue : value, disabled);
  const selectedIndex = options.findIndex((option) => Object.is(option.value, value));
  const selectedTone = options[selectedIndex]?.tone || tone;

  const groupStyle = useJellyToneStyle(tone);
  const contourStyle = useJellyToneStyle(selectedTone);

  const select = (index, focus) => {
    const option = options[index];
    if (!option || option.disabled || disabled) return;
    if (focus) itemRefs.current[index]?.focus();
    if (!Object.is(option.value, value)) onValueChange?.(option.value);
  };
  return <div {...props} id={groupId} dir={dir} role={manual ? "toolbar" : "radiogroup"} aria-orientation={orientation}
    aria-disabled={disabled || undefined} data-gel-group={groupId}
    ref={(node) => { groupRef.current = node; assignRef(ref, node); }}
    className={cx('jb-selection-group', `jb-size-${size}`, orientation === 'vertical' && 'jb-selection-vertical', className)}
    style={{ ...groupStyle, ...style }}
    onKeyDown={(event) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;
      const current = itemRefs.current.indexOf(event.target);
      if (current < 0) return;
      const direction = dir || groupRef.current?.closest('[dir]')?.getAttribute('dir') || 'ltr';
      const target = selectionKeyIndex(options, current, event.key, { disabled, dir: direction });
      if (target >= 0) {
        event.preventDefault();
        if (manual) itemRefs.current[target]?.focus();
        else select(target, true);
      }
    }}>
    <SelectionContour groupRef={groupRef} selectedKey={value} selector={manual ? '[aria-pressed="true"]' : '[aria-checked="true"]'} style={contourStyle} />
    {options.map((option, index) => {
      const selected = Object.is(option.value, value);
      const itemDisabled = disabled || Boolean(option.disabled);
      const rendered = typeof option.render === 'function' ? option.render({ option, selected, disabled: itemDisabled }) : option.render ?? option.content;
      const labelId = rendered != null && typeof option.label !== 'string' ? `${groupId}-label-${index}` : undefined;
      const descriptionId = option.description ? `${groupId}-description-${index}` : undefined;
      return <JellyOption tone={option.tone || tone} chosen={selected} key={`${typeof option.value}:${option.value}`} ref={(node) => { itemRefs.current[index] = node; }}
        type="button" role={manual ? undefined : "radio"} aria-checked={manual ? undefined : selected} aria-pressed={manual ? selected : undefined} onFocus={() => setFocusValue(option.value)} disabled={itemDisabled} tabIndex={index === tabIndex ? 0 : -1}
        aria-label={typeof option.label === 'string' ? option.label : undefined} aria-labelledby={labelId} aria-describedby={descriptionId}
        data-gel-option="" data-gel-key={`${typeof option.value}:${String(option.value)}`} data-gel-surface="" data-gel-tone={option.tone || tone}
        className="jb-selection-option" onClick={() => select(index, false)}>
        <svg className="jb-selection-indicator" aria-hidden="true" viewBox="0 0 12 12"><path d="m2.5 6 2.2 2.2 4.8-4.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        {labelId && <span className="jb-visually-hidden" id={labelId}>{option.label}</span>}
        <span className="jb-selection-content">{rendered ?? <span className="jb-selection-label">{option.label}</span>}
          {option.description && <span className="jb-selection-description" id={descriptionId}>{option.description}</span>}
        </span>
      </JellyOption>;
    })}
    {name && <input type="hidden" name={name} value={value ?? ''} disabled={disabled} />}
  </div>;
});

export const JellySlider = forwardRef(function JellySlider({
  label, description, value, defaultValue, onValueChange, onChange, min = 0, max = 100, step = 1,
  formatValue = (number) => String(number), tone = 'action', compact = false, animateTrack = false, id, disabled, className, style, ...props
}, ref) {
  const generated = useId();
  const inputId = uniqueId('jb-slider', id, generated);
  const scrub = useRef(null);
  const leaveTimer = useRef(null);
  const inputRef = useRef(null);
  const [current, setCurrent] = useState(value ?? defaultValue ?? min);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  const engaged = hovered || focused || dragging;
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const beginDrag = () => setDragging(true);
  const material = useJellyControlStyle(tone, disabled ? 'disabled' : dragging ? 'pressed' : engaged ? 'highlighted' : 'rest');
  const fillMaterial = useJellyControlStyle(tone, disabled ? 'disabled' : dragging ? 'pressed' : engaged ? 'highlighted' : 'selected');
  const progress = max > min ? Math.max(0, Math.min(100, (current - min) / (max - min) * 100)) : 0;
  const descriptionId = description ? `${inputId}-description` : undefined;
  useBrowserLayoutEffect(() => {
    const normalized = inputRef.current?.valueAsNumber;
    if (Number.isFinite(normalized)) setCurrent(normalized);
  }, [value, defaultValue, min, max, step]);
  useEffect(() => {
    if (value !== undefined) return;
    const input = inputRef.current;
    const form = input?.form;
    let resetTimer;
    // The reset event precedes the browser's default value restoration.
    const reset = () => { resetTimer = setTimeout(() => {
      if (Number.isFinite(input.valueAsNumber)) setCurrent(input.valueAsNumber);
    }, 0); };
    form?.addEventListener('reset', reset);
    return () => { clearTimeout(resetTimer); form?.removeEventListener('reset', reset); };
  }, [value, defaultValue, min, max, step, props.form]);
  useEffect(() => {
    if (!dragging) return;
    const release = event => { if (scrub.current && event.type !== 'pointerup') { commit(scrub.current.origin); scrub.current = null; } setDragging(false); };
    window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release); window.addEventListener('blur', release);
    return () => { window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); window.removeEventListener('blur', release); };
  }, [dragging]);
  const commit = next => {
    const input = inputRef.current;
    if (!input || disabled || input.valueAsNumber === next) return;
    // Use the native range event path so forms and onChange behave identically.
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(next));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const travel = useSliderTravel({ inputRef, enabled: animateTrack, disabled, value, min, max, step, form: props.form, commit, onDirect: beginDrag });
  const range = () => ({ min: Number(min), max: Number(max), step, rtl: getComputedStyle(inputRef.current).direction === 'rtl' });
  const endScrub = (event, cancel = false) => {
    if (!scrub.current) return;
    if (cancel) commit(scrub.current.origin);
    scrub.current = null; setDragging(false);
    if (event?.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return <div dir={props.dir} className={cx('jb-slider', compact && 'jb-slider-compact', disabled && 'jb-disabled', className)}
    data-gel-dragging={dragging && !disabled || undefined} data-gel-engaged={engaged && !disabled || undefined}
    onPointerEnter={event => { clearTimeout(leaveTimer.current); if (event.pointerType !== 'touch') setHovered(true); }}
    onPointerLeave={() => { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setHovered(false), MOTION.sliderGrace); }}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
    style={{ ...material, '--jb-progress': `${progress}%`, '--jb-fraction': progress / 100, '--jb-slider-gather': `${MOTION.sliderGather}ms`, '--jb-slider-melt': `${MOTION.sliderMelt}ms`, ...style }}>
    <div className="jb-field-heading"><label id={`${inputId}-label`} htmlFor={inputId}>{label}</label>

      <span id={`${inputId}-scrub-help`} className="jb-visually-hidden">Drag horizontally to adjust; hold Shift for fine adjustment. Arrow keys adjust; Home and End reach the limits. Escape cancels a drag.</span>
    </div>
    <div className="jb-range-control">
      <span className="jb-range-lens" aria-hidden="true" data-gel-surface="track" data-gel-tone="neutral" data-gel-sampled="true" />
      <span className="jb-range-fill" aria-hidden="true" data-gel-surface="fill" data-gel-tone={tone} data-gel-sampled="true" style={fillMaterial} />
      <span className="jb-range-travel" aria-hidden="true"><span className="jb-range-thumb" data-gel-surface="thumb" data-gel-tone={tone} data-gel-sampled="true" data-gel-hover={engaged && !disabled || undefined} data-gel-pressed={dragging && !disabled || undefined} /></span>
      <input {...props} ref={(node) => { inputRef.current = node; assignRef(ref, node); }} id={inputId} type="range" min={min} max={max} step={step} disabled={disabled}
        value={value} defaultValue={value === undefined ? defaultValue ?? min : undefined} aria-describedby={ids(props['aria-describedby'], descriptionId)}
        onPointerDown={event => { props.onPointerDown?.(event); if (!event.defaultPrevented && !disabled && !travel.pointerDown(event)) beginDrag(); }}
        onPointerMove={event => { props.onPointerMove?.(event); if (!event.defaultPrevented) travel.pointerMove(event); }}
        onPointerUp={event => { travel.pointerUp(event); setDragging(false); props.onPointerUp?.(event); }}
        onPointerCancel={event => { travel.pointerCancel(event); setDragging(false); props.onPointerCancel?.(event); }}
        onLostPointerCapture={event => { travel.lostCapture(event); props.onLostPointerCapture?.(event); }}
        onKeyDown={event => { if (travel.keyDown(event)) setDragging(false); props.onKeyDown?.(event); }}
        onChange={(event) => { travel.nativeChange(); const next = event.currentTarget.valueAsNumber; if (value === undefined) setCurrent(next); onValueChange?.(next); onChange?.(event); }} />
    </div>
      <button type="button" className="jb-range-value" disabled={disabled} data-gel-surface="badge" data-gel-tone={tone} data-gel-sampled="true" data-gel-assist="false"
        aria-labelledby={`${inputId}-label ${inputId}-value`} aria-describedby={`${inputId}-scrub-help`}
        title="Drag to adjust. Hold Shift for finer control."
        onPointerDown={e => { if (e.button !== 0) return; travel.cancel(); const start = inputRef.current.valueAsNumber; scrub.current = { x: e.clientX, value: start, current: start, origin: start, fine: e.shiftKey }; e.currentTarget.setPointerCapture(e.pointerId); beginDrag(); }}
        onPointerMove={e => { if (scrub.current) { scrub.current = advanceScrub(scrub.current, e.clientX, e.shiftKey, range()); commit(scrub.current.current); } }}
        onPointerUp={e => endScrub(e)} onPointerCancel={e => endScrub(e, true)} onLostPointerCapture={e => endScrub(e, true)}
        onKeyDown={e => {
          travel.cancel();
          if (e.key === 'Escape' && scrub.current) { e.preventDefault(); e.stopPropagation(); endScrub(e, true); return; }
          if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
            e.preventDefault(); const r = range(), unit = step === 'any' ? (max - min) / 100 : Number(step);
            const horizontal = e.key === 'ArrowLeft' || e.key === 'ArrowRight';
            const direction = (['ArrowUp','ArrowRight'].includes(e.key) ? 1 : -1) * (horizontal && r.rtl ? -1 : 1);
            commit(e.key === 'Home' ? Number(min) : e.key === 'End' ? Number(max) : Math.max(Number(min), Math.min(Number(max), current + direction * unit * (e.shiftKey ? 10 : 1))));
          }
        }}><span id={`${inputId}-value`}>{formatValue(current)}</span></button>
    {description && <p className="jb-field-description" id={descriptionId}>{description}</p>}
  </div>;
});

export const JellySwitch = forwardRef(function JellySwitch({
  label, description, checked, defaultChecked = false, onCheckedChange, onChange, tone = 'success',
  id, disabled, className, style, ...props
}, ref) {
  const generated = useId();
  const inputId = uniqueId('jb-switch', id, generated);
  const inputRef = useRef(null);
  const [internal, setInternal] = useState(defaultChecked);
  const active = checked ?? internal;
  const descriptionId = description ? `${inputId}-description` : undefined;
  useEffect(() => {
    if (checked !== undefined) return;
    const input = inputRef.current;
    const form = input?.form;
    let resetTimer;
    const reset = () => { resetTimer = setTimeout(() => setInternal(input.checked), 0); };
    form?.addEventListener('reset', reset);
    return () => { clearTimeout(resetTimer); form?.removeEventListener('reset', reset); };
  }, [checked, defaultChecked]);
  return <label htmlFor={inputId} className={cx('jb-switch', active && 'jb-switch-on', disabled && 'jb-disabled', className)} style={{ ...useJellyToneStyle(active ? tone : 'neutral'), ...style }}>
    <span className="jb-switch-track" data-gel-surface="" data-gel-tone={active ? tone : 'neutral'}>
      <input {...props} ref={(node) => { inputRef.current = node; assignRef(ref, node); }} id={inputId} type="checkbox" role="switch" checked={checked} defaultChecked={checked === undefined ? defaultChecked : undefined}
        disabled={disabled} aria-describedby={ids(props['aria-describedby'], descriptionId)}
        onChange={(event) => { const next = event.currentTarget.checked; setInternal(next); onCheckedChange?.(next); onChange?.(event); }} />
      <span className="jb-switch-thumb" aria-hidden="true" />
    </span>
    <span className="jb-switch-copy"><span className="jb-field-label">{label}</span>{description && <span className="jb-field-description" id={descriptionId}>{description}</span>}</span>
  </label>;
});

export const JellyInput = forwardRef(function JellyInput({
  label, description, error, tone = 'neutral', id, className, style, disabled, ...props
}, ref) {
  const generated = useId();
  const inputId = uniqueId('jb-input', id, generated);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error && typeof error !== 'boolean' ? `${inputId}-error` : undefined;
  return <div className={cx('jb-input-field', disabled && 'jb-disabled', className)} style={{ ...useJellyToneStyle(error ? 'danger' : tone), ...style }}>
    <label className="jb-field-label" htmlFor={inputId}>{label}</label>
    <input {...props} ref={ref} id={inputId} disabled={disabled} className="jb-input" data-gel-surface="" data-gel-tone={error ? 'danger' : tone}
      aria-invalid={error ? true : props['aria-invalid']} aria-describedby={ids(props['aria-describedby'], descriptionId, errorId)} />
    {description && <p className="jb-field-description" id={descriptionId}>{description}</p>}
    {errorId && <p className="jb-field-error" id={errorId}>{error}</p>}
  </div>;
});

export const JellyBadge = forwardRef(function JellyBadge({ children, tone = 'neutral', className, style, ...props }, ref) {
  return <span {...props} ref={ref} className={cx('jb-badge', className)} data-jb-tone={tone} data-gel-surface="badge" data-gel-tone={tone} style={{ ...useJellyToneStyle(tone), ...style }}>{children}</span>;
});

export const JellyAlert = forwardRef(function JellyAlert({
  children, tone = 'info', title, live = 'off', dismissible = false, onDismiss,
  dismissLabel = 'Dismiss notification', className, style, ...props
}, ref) {
  const [visible, setVisible] = useState(true);
  const materialStyle = useJellyToneStyle(tone);
  if (!visible) return null;
  return <div {...props} ref={ref} role={props.role || (live === 'assertive' ? 'alert' : live === 'polite' ? 'status' : 'note')}
    aria-live={live} aria-atomic={live === 'off' ? undefined : true}
    className={cx('jb-alert', className)} style={{ ...materialStyle, ...style }} data-jb-tone={tone} data-gel-surface="alert" data-gel-tone={tone}>
    <span className="jb-alert-dot" aria-hidden="true" />
    <div className="jb-alert-copy">{title && <strong className="jb-alert-title">{title}</strong>}<div className="jb-alert-content">{children}</div></div>
    {dismissible && <button type="button" className="jb-alert-dismiss" data-gel-surface="" data-gel-tone={tone} aria-label={dismissLabel} onClick={() => { setVisible(false); onDismiss?.(); }}>×</button>}
  </div>;
});

export const JellySkeleton = forwardRef(function JellySkeleton({ lines = 3, label = 'Loading content', animated = true, className, style, ...props }, ref) {
  const count = Math.max(1, Math.min(10, Math.floor(lines) || 1));
  return <div {...props} ref={ref} role="status" className={cx('jb-skeleton', !animated && 'jb-skeleton-still', className)} style={style}>
    <span className="jb-visually-hidden">{label}</span>
    <div aria-hidden="true" className="jb-skeleton-lines">{Array.from({ length: count }, (_, index) => <span className="jb-skeleton-line" key={index} />)}</div>
  </div>;
});
