import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { toneStyle } from './tokens.js';
import { selectionKeyIndex, selectionTabIndex } from './selection.js';
import { SelectionContour } from './SelectionContour.jsx';
import { useJellyToneStyle } from './useMaterialColor.js';
import { MOTION } from './renderer/motion.js';
import './controls.css';

const cx = (...values) => values.filter(Boolean).join(' ');
const ids = (...values) => values.filter(Boolean).join(' ') || undefined;
const assignRef = (ref, node) => { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; };
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const serialize = (value) => value === undefined || value === null ? '' : String(value);
const makeId = (prefix, id, generated) => id || `${prefix}-${generated.replace(/:/g, '')}`;

export const JellyTabs = forwardRef(function JellyTabs({
  items, value, defaultValue, onValueChange, tone = 'action', orientation = 'horizontal', disabled = false,
  id, dir, className, style, onKeyDown, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, ...props
}, ref) {
  const generated = useId();
  const rootId = makeId('jb-tabs', id, generated);
  const first = items.find((item) => !item.disabled)?.value;
  const [internal, setInternal] = useState(() => items.some((item) => Object.is(item.value, defaultValue) && !item.disabled) ? defaultValue : first);
  const current = value === undefined ? internal : value;
  const selectedIndex = items.findIndex((item) => Object.is(item.value, current));
  const tabStop = selectionTabIndex(items, current, disabled);
  const materialStyle = useJellyToneStyle(tone);
  const selectionStyle = useJellyToneStyle(items[selectedIndex]?.tone || tone);
  const groupRef = useRef(null);
  const itemRefs = useRef([]);
  const select = (index, focus = false) => {
    const item = items[index];
    if (!item || disabled || item.disabled) return;
    if (focus) itemRefs.current[index]?.focus();
    if (Object.is(item.value, current)) return;
    if (value === undefined) setInternal(item.value);
    onValueChange?.(item.value);
  };
  return <div {...props} id={rootId} ref={ref} dir={dir} className={cx('jb-tabs', orientation === 'vertical' && 'jb-tabs-vertical', className)} style={{ ...materialStyle, ...style }}>
    <div ref={groupRef} role="tablist" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}
      aria-orientation={orientation} aria-disabled={disabled || undefined} data-gel-group={`${rootId}-list`}
      className={cx('jb-selection-group', 'jb-tabs-list', orientation === 'vertical' && 'jb-selection-vertical')}
      style={selectionStyle} onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (orientation === 'horizontal' && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) return;
        if (orientation === 'vertical' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) return;
        const index = itemRefs.current.indexOf(event.target);
        if (index < 0) return;
        const direction = dir || groupRef.current?.closest('[dir]')?.getAttribute('dir') || 'ltr';
        const next = selectionKeyIndex(items, index, event.key, { disabled, dir: direction });
        if (next >= 0) { event.preventDefault(); itemRefs.current[next]?.focus(); }
      }}>
      <SelectionContour groupRef={groupRef} selectedKey={current} selector="[aria-selected='true']" />
      {items.map((item, index) => <button key={`${typeof item.value}:${item.value}`} ref={(node) => { itemRefs.current[index] = node; }}
        id={`${rootId}-tab-${index}`} type="button" role="tab" aria-selected={index === selectedIndex}
        aria-controls={`${rootId}-panel-${index}`} tabIndex={index === tabStop ? 0 : -1} disabled={disabled || item.disabled}
        data-gel-option="" data-gel-key={`${typeof item.value}:${item.value}`} data-gel-surface="" data-gel-tone={item.tone || tone}
        className="jb-selection-option jb-tab" style={toneStyle(item.tone || tone)} onFocus={() => select(index)} onClick={() => select(index)}>
        <span className="jb-selection-content">{item.label}</span>
      </button>)}
    </div>
    <div className="jb-tab-panels">{items.map((item, index) => <div key={`${typeof item.value}:${item.value}`}
      id={`${rootId}-panel-${index}`} role="tabpanel" aria-labelledby={`${rootId}-tab-${index}`}
      hidden={index !== selectedIndex} tabIndex={0} className="jb-tab-panel">{item.content}</div>)}</div>
  </div>;
});

export const JellyDropdown = forwardRef(function JellyDropdown({
  label, options, value, defaultValue, onValueChange, placeholder = 'Choose an option', description, error,
  disabled = false, required = false, tone = 'info', name, form, id, nativeRef, className, style,
  onInvalid, onKeyDown, onClick, ...props
}, ref) {
  const generated = useId();
  const inputId = makeId('jb-dropdown', id, generated);
  const rootRef = useRef(null);
  const triggerRef = useRef(null);
  const selectRef = useRef(null);
  const listRef = useRef(null);
  const shellRef = useRef(null);
  const shellAnimation = useRef(null);
  const wasOpen = useRef(false);
  const [internal, setInternal] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [invalid, setInvalid] = useState(false);
  const [above, setAbove] = useState(false);
  const search = useRef({ text: '', time: 0 });
  const current = value === undefined ? internal : value;
  const materialStyle = useJellyToneStyle('neutral');
  const latest = useRef({ value });
  latest.current = { value };
  const selected = options.findIndex((option) => Object.is(option.value, current));
  const message = error || (invalid ? 'Choose an option.' : undefined);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = message && typeof message !== 'boolean' ? `${inputId}-error` : undefined;
  const labelId = `${inputId}-label`;
  const valueId = `${inputId}-value`;
  const listId = `${inputId}-list`;
  const close = (restore = false) => { setOpen(false); search.current.text = ''; if (restore) triggerRef.current?.focus(); };
  const show = (key) => {
    if (disabled) return;
    const next = key === 'Home' || key === 'End' ? selectionKeyIndex(options, -1, key) : selected >= 0 && !options[selected].disabled ? selected : selectionKeyIndex(options, -1, key === 'ArrowUp' ? 'End' : 'Home');
    setActive(next); setOpen(true);
  };
  const choose = (index) => {
    const option = options[index];
    if (!option || disabled || option.disabled) return;
    if (value === undefined) {
      if (selectRef.current) selectRef.current.value = serialize(option.value);
      setInternal(option.value);
    }
    setInvalid(false);
    if (!Object.is(option.value, current)) onValueChange?.(option.value);
    close(true);
  };
  const typeAhead = (character) => {
    const now = Date.now();
    const previous = now - search.current.time < 700 ? search.current.text : '';
    const text = (previous + character).toLocaleLowerCase();
    search.current = { text, time: now };
    const query = [...text].every((letter) => letter === text[0]) ? text[0] : text;
    const start = open ? active : selected;
    for (let offset = 1; offset <= options.length; offset++) {
      const index = (start + offset + options.length) % options.length;
      if (!options[index].disabled && options[index].label.toLocaleLowerCase().startsWith(query)) {
        setActive(index); setOpen(true); return;
      }
    }
  };
  useBrowserLayoutEffect(() => {
    if (!open || !rootRef.current || !listRef.current) return;
    const position = () => {
      const control = triggerRef.current.parentElement;
      const bounds = control.getBoundingClientRect();
      const trigger = triggerRef.current.getBoundingClientRect();
      const viewport = window.visualViewport;
      const top = viewport?.offsetTop || 0;
      const bottom = top + (viewport?.height || window.innerHeight);
      const below = bottom - trigger.bottom - 12;
      const over = trigger.top - top - 12;
      const upwards = below < Math.min(listRef.current.scrollHeight, 260) && over > below;
      setAbove(upwards);
      listRef.current.style.top = upwards ? 'auto' : `${trigger.bottom - bounds.top - 2}px`;
      listRef.current.style.bottom = upwards ? `${bounds.bottom - trigger.top - 2}px` : 'auto';
      listRef.current.style.maxHeight = `${Math.max(48, Math.min(260, upwards ? over : below))}px`;
      const menu = listRef.current.getBoundingClientRect();
      shellRef.current.style.top = `${Math.min(trigger.top, menu.top) - bounds.top}px`;
      shellRef.current.style.height = `${Math.max(trigger.bottom, menu.bottom) - Math.min(trigger.top, menu.top)}px`;
      shellRef.current.style.transformOrigin = upwards ? '50% 100%' : '50% 0';
    };
    position();
    const resize = new ResizeObserver(position);
    resize.observe(triggerRef.current); resize.observe(listRef.current);
    window.addEventListener('resize', position);
    window.visualViewport?.addEventListener('resize', position);
    return () => { resize.disconnect(); window.removeEventListener('resize', position); window.visualViewport?.removeEventListener('resize', position); };
  }, [open, options.length]);
  useBrowserLayoutEffect(() => {
    const shell = shellRef.current;
    if (!open || !shell) { shellAnimation.current?.cancel(); wasOpen.current = false; return; }
    const opening = !wasOpen.current;
    wasOpen.current = true;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !shell.animate) return;
    // The same measured body carries the trigger and the menu. Only its material
    // strains; labels and hit targets stay put, including rapid interruptions.
    const from = shellAnimation.current?.playState === 'running' ? getComputedStyle(shell).transform : opening ? 'scale(.985, .92)' : 'scale(1.003, .994)';
    shellAnimation.current?.cancel();
    shellAnimation.current = shell.animate([
      { transform: from, offset: 0, easing: MOTION.recoilCurve },
      { transform: 'scale(1.006, 1.012)', offset: .42, easing: MOTION.settle },
      { transform: 'scale(.998, .995)', offset: .7, easing: MOTION.settle },
      { transform: 'scale(1.001, 1.002)', offset: .86, easing: MOTION.settle },
      { transform: 'none', offset: 1 },
    ], { duration: MOTION.recoil });
    shell.dispatchEvent(new Event('jellybox:motion', { bubbles: true }));
  }, [open]);
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const stop = () => { if (media.matches) shellAnimation.current?.cancel(); };
    media.addEventListener('change', stop);
    return () => { media.removeEventListener('change', stop); shellAnimation.current?.cancel(); };
  }, []);
  useBrowserLayoutEffect(() => {
    // Decorative renderer projections can be siblings of the options.
    if (open && active >= 0) listRef.current?.querySelectorAll('[role="option"]')[active]?.scrollIntoView?.({ block: 'nearest' });
  }, [open, active, inputId]);
  useEffect(() => {
    if (disabled) close();
  }, [disabled]);
  useEffect(() => {
    if (!open) return;
    const outside = (event) => { if (!rootRef.current?.contains(event.target)) close(); };
    const dialog = rootRef.current?.closest('dialog');
    const cancel = (event) => { event.preventDefault(); close(true); };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('focusin', outside);
    dialog?.addEventListener('cancel', cancel);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('focusin', outside); dialog?.removeEventListener('cancel', cancel); };
  }, [open]);
  useEffect(() => {
    const native = selectRef.current;
    const parent = native?.form;
    let timer;
    const reset = (event) => { timer = setTimeout(() => {
      if (event.defaultPrevented) return;
      if (latest.current.value !== undefined) native.value = serialize(latest.current.value);
      else setInternal(options[native.selectedIndex - 1]?.value);
      setInvalid(false); close();
    }, 0); };
    parent?.addEventListener('reset', reset);
    return () => { clearTimeout(timer); parent?.removeEventListener('reset', reset); };
  }, [options, form]);
  return <div ref={rootRef} data-open={open || undefined} className={cx('jb-dropdown', disabled && 'jb-disabled', className)} style={{ ...materialStyle, ...style }}>
    <label htmlFor={inputId} id={labelId} className="jb-field-label">{label}{required && <span aria-hidden="true"> *</span>}</label>
    <div className="jb-dropdown-control">
    <div ref={shellRef} className="jb-dropdown-shell" hidden={!open} data-gel-surface="menu" data-gel-tone="neutral" aria-hidden="true" />
    <button {...props} ref={(node) => { triggerRef.current = node; assignRef(ref, node); }} id={inputId} type="button" form={form}
      role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}
      aria-activedescendant={open && active >= 0 ? `${inputId}-option-${active}` : undefined}
      aria-labelledby={props['aria-labelledby'] || (props['aria-label'] ? undefined : ids(labelId, valueId))} aria-describedby={ids(props['aria-describedby'], descriptionId, errorId)}
      aria-required={required || undefined} aria-invalid={message ? true : props['aria-invalid']} disabled={disabled}
      className="jb-button jb-dropdown-trigger" data-gel-surface={open ? undefined : 'control'} data-gel-tone="neutral" data-gel-highlight={tone}
      onClick={(event) => { onClick?.(event); if (!event.defaultPrevented) open ? close() : show('ArrowDown'); }} onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled) return;
        if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); return; }
        if (event.key === 'Tab') { close(); return; }
        if (event.altKey && event.key === 'ArrowUp' && open) { event.preventDefault(); close(true); return; }
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          search.current.text = '';
          if (!open) show(event.key); else setActive(selectionKeyIndex(options, active, event.key));
          return;
        }
        if ((event.key === 'Enter' || event.key === ' ') && open) { event.preventDefault(); choose(active); return; }
        if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); typeAhead(event.key); }
      }}>
      <span className="jb-button-face"><span id={valueId} className={cx('jb-dropdown-value', selected < 0 && 'jb-dropdown-placeholder')}>{selected < 0 ? placeholder : options[selected].label}</span>
        <svg className="jb-dropdown-chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 6 4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </span>
    </button>
    <div ref={listRef} id={listId} role="listbox" aria-labelledby={labelId} hidden={!open}
      data-gel-connected="true" data-gel-tone="neutral" data-gel-group={listId} data-gel-selection-mode="active" className={cx('jb-dropdown-list', above && 'jb-dropdown-above')}>
      <SelectionContour groupRef={listRef} selectedKey={active} selector={'[data-active="true"]'} />
      {options.map((option, index) => <div key={`${typeof option.value}:${option.value}`} id={`${inputId}-option-${index}`}
        role="option" aria-selected={index === selected} aria-disabled={option.disabled || undefined}
        data-gel-option="" data-gel-key={`${typeof option.value}:${option.value}`} data-gel-tone={tone} data-active={index === active || undefined} className="jb-dropdown-option" style={toneStyle(tone)}
        onPointerMove={() => { if (!option.disabled) setActive(index); }} onPointerDown={(event) => { if (event.pointerType === 'mouse') event.preventDefault(); }} onClick={() => choose(index)}>
        <span className="jb-dropdown-option-copy"><span>{option.label}</span>{option.description && <small>{option.description}</small>}</span>
        <svg className="jb-dropdown-check" width="14" height="14" viewBox="0 0 12 12" aria-hidden="true"><path d="m2.5 6 2.2 2.2 4.8-4.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>)}
      {!options.length && <span className="jb-dropdown-empty">No options available</span>}
    </div>
    </div>
    <select ref={(node) => { selectRef.current = node; assignRef(nativeRef, node); }} className="jb-dropdown-native"
      name={name} form={form} disabled={disabled} required={required} tabIndex={-1} aria-hidden="true"
      value={value === undefined ? undefined : serialize(value)} defaultValue={value === undefined ? serialize(defaultValue) : undefined}
      onInvalid={(event) => { onInvalid?.(event); event.preventDefault(); setInvalid(true); triggerRef.current?.focus(); }}
      onChange={(event) => { const option = options[event.currentTarget.selectedIndex - 1]; if (value === undefined) setInternal(option?.value); setInvalid(false); if (option && !Object.is(option.value, current)) onValueChange?.(option.value); }}>
      <option value="">{placeholder}</option>{options.map((option) => <option key={`${typeof option.value}:${option.value}`} value={serialize(option.value)} disabled={option.disabled}>{option.label}</option>)}
    </select>
    {description && <p id={descriptionId} className="jb-field-description">{description}</p>}
    {errorId && <p id={errorId} className="jb-field-error">{message}</p>}
  </div>;
});

export const JellyCheckbox = forwardRef(function JellyCheckbox({
  label, description, checked, defaultChecked = false, indeterminate = false, onCheckedChange, onChange,
  error, disabled = false, tone = 'action', optical = true, id, className, style, ...props
}, ref) {
  const generated = useId();
  const inputId = makeId('jb-checkbox', id, generated);
  const labelId = label != null ? `${inputId}-label` : undefined;
  const inputRef = useRef(null);
  const [internal, setInternal] = useState(defaultChecked);
  const active = checked === undefined ? internal : checked;
  const materialStyle = useJellyToneStyle(error ? 'danger' : tone);
  const descriptionId = description ? `${inputId}-description` : undefined;
  const errorId = error && typeof error !== 'boolean' ? `${inputId}-error` : undefined;
  const latest = useRef({ checked, indeterminate });
  latest.current = { checked, indeterminate };
  useBrowserLayoutEffect(() => { if (inputRef.current) inputRef.current.indeterminate = indeterminate; }, [indeterminate, active]);
  useEffect(() => {
    const input = inputRef.current;
    const form = input?.form;
    let timer;
    const reset = (event) => { timer = setTimeout(() => {
      if (event.defaultPrevented) return;
      if (latest.current.checked !== undefined) input.checked = latest.current.checked;
      else setInternal(input.checked);
      input.indeterminate = latest.current.indeterminate;
    }, 0); };
    form?.addEventListener('reset', reset);
    return () => { clearTimeout(timer); form?.removeEventListener('reset', reset); };
  }, [props.form]);
  return <label htmlFor={inputId} className={cx('jb-checkbox', active && 'jb-checkbox-on', indeterminate && 'jb-checkbox-mixed', disabled && 'jb-disabled', className)} style={{ ...materialStyle, ...style }}>
    <span className="jb-checkbox-slot"><span className="jb-checkbox-box" data-gel-surface={optical ? '' : undefined} data-gel-tone={error ? 'danger' : tone}>
      <input {...props} id={inputId} ref={(node) => { inputRef.current = node; assignRef(ref, node); }} type="checkbox" disabled={disabled}
        checked={checked} defaultChecked={checked === undefined ? defaultChecked : undefined}
        aria-checked={indeterminate ? 'mixed' : undefined} aria-invalid={error ? true : props['aria-invalid']}
        aria-labelledby={props['aria-labelledby'] || (props['aria-label'] ? undefined : labelId)}
        aria-describedby={ids(props['aria-describedby'], descriptionId, errorId)} onChange={(event) => {
          const next = event.currentTarget.checked;
          if (checked === undefined) setInternal(next);
          onCheckedChange?.(next); onChange?.(event);
        }} />
      <span className="jb-checkbox-face" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 16 16"><path className="jb-checkbox-tick" d="m3 8 3.3 3.3L13 4.7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><path className="jb-checkbox-dash" d="M4 8h8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg></span>
    </span></span>
    <span className="jb-checkbox-copy"><span id={labelId} className="jb-field-label">{label}</span>
      {description && <span id={descriptionId} className="jb-field-description">{description}</span>}
      {errorId && <span id={errorId} className="jb-field-error">{error}</span>}
    </span>
  </label>;
});
