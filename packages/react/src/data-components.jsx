import { forwardRef, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { useJellyToneStyle } from './useMaterialColor.js';
import { MOTION } from './renderer/motion.js';
import { JellyCheckbox } from './controls.jsx';
import { restoreDialogFocus, wrapDialogTab } from './dialog-focus.js';
import './data-components.css';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;
const cx = (...values) => values.filter(Boolean).join(' ');
const assignRef = (ref, node) => { if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; };

export const JellyDialog = forwardRef(function JellyDialog({
  open, onOpenChange, title, description, tone = 'info', children, footer,
  initialFocusRef, closeLabel = 'Close dialog', renderSurface, className, style,
}, forwardedRef) {
  const materialStyle = useJellyToneStyle(tone);
  const generated = useId();
  const titleId = `jb-dialog-title-${generated}`;
  const descriptionId = description != null ? `jb-dialog-description-${generated}` : undefined;
  const dialogRef = useRef(null);
  const frameRef = useRef(null);
  const lastFocused = useRef(null);
  const animationRef = useRef(null);
  const generation = useRef(0);
  const latest = useRef({ open, onOpenChange, initialFocusRef });
  latest.current = { open, onOpenChange, initialFocusRef };

  // Closing the native modal also releases its inert background and restores focus.
  useBrowserLayoutEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      generation.current += 1;
      animationRef.current?.cancel();
      if (dialog?.open) dialog.close();
    };
  }, []);

  useBrowserLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    // Native property assignment also supports React 18's inert attribute path.
    if (frameRef.current) frameRef.current.inert = !open;
    const ticket = ++generation.current;
    const wasOpen = dialog.open;
    const previous = wasOpen ? getComputedStyle(dialog) : null;
    const start = previous
      ? { opacity: previous.opacity, transform: previous.transform }
      : { opacity: 0, transform: 'translateY(14px)' };
    animationRef.current?.cancel();
    animationRef.current = null;
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');

    const finish = () => {
      if (ticket !== generation.current) return;
      animationRef.current?.cancel();
      animationRef.current = null;
      if (latest.current.open) dialog.dataset.state = 'open';
      else {
        dialog.dataset.state = 'closed';
        if (dialog.open) dialog.close();
      }
    };

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
        const target = latest.current.initialFocusRef?.current;
        if (target) restoreDialogFocus(dialog, [target], true);
      } else restoreDialogFocus(dialog, [lastFocused.current, latest.current.initialFocusRef?.current]);
      dialog.dataset.state = 'opening';
    } else if (dialog.open) dialog.dataset.state = 'closing';
    else { dialog.dataset.state = 'closed'; return; }

    if (media?.matches || typeof dialog.animate !== 'function') finish();
    else {
      const end = open ? { opacity: 1, transform: 'translateY(0)' } : { opacity: 0, transform: 'translateY(8px)' };
      const animation = dialog.animate([start, end], {
        duration: open ? MOTION.material : MOTION.fade,
        easing: MOTION.settle, fill: 'both',
      });
      animationRef.current = animation;
      animation.finished.then(finish, () => {});
    }
    const motionChange = () => { if (media.matches) finish(); };
    media?.addEventListener?.('change', motionChange);
    return () => media?.removeEventListener?.('change', motionChange);
  }, [open]);

  const requestClose = () => { if (latest.current.open) latest.current.onOpenChange?.(false); };
  // The string form remains compatible with React 18's unknown-attribute path.
  const content = <div className="jb-dialog-frame" inert={open ? undefined : 'inert'}
    ref={node => { frameRef.current = node; if (node) node.inert = !open; }}>
    <header className="jb-dialog-header">
      <div className="jb-dialog-heading"><h2 id={titleId}>{title}</h2>{descriptionId && <p id={descriptionId}>{description}</p>}</div>
      <button type="button" className="jb-dialog-close" aria-label={closeLabel} onClick={requestClose}>×</button>
    </header>
    <div className="jb-dialog-body">{children}</div>
    {footer != null && <footer className="jb-dialog-footer">{footer}</footer>}
  </div>;
  return <dialog ref={node => { dialogRef.current = node; assignRef(forwardedRef, node); }}
    className={cx('jb-dialog', renderSurface && 'jb-dialog-optical', className)} style={{ ...materialStyle, ...style }}
    aria-labelledby={titleId} aria-describedby={descriptionId} aria-modal="true"
    onFocusCapture={event => {
      if (latest.current.open && event.target !== event.currentTarget && event.currentTarget.contains(event.target)) lastFocused.current = event.target;
    }}
    onKeyDown={event => wrapDialogTab(event, event.currentTarget)}
    onSubmitCapture={event => { if (!latest.current.open) { event.preventDefault(); event.stopPropagation(); } }}
    onCancel={event => { event.preventDefault(); requestClose(); }}
    onClose={() => { if (!dialogRef.current?.open && latest.current.open) requestClose(); }}>
    {renderSurface ? renderSurface(content) : content}
  </dialog>;
});

function TableCheckbox({ mixed = false, tone, 'aria-label': label, ...props }) {
  return <JellyCheckbox {...props} tone={tone} label={label} aria-label={label}
    indeterminate={mixed} optical className="jb-table-check" />;
}

const compareValues = (left, right) => {
  if (left == null || right == null) return left == null ? (right == null ? 0 : 1) : -1;
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  if (left instanceof Date && right instanceof Date) return left.getTime() - right.getTime();
  return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' });
};

export const JellyTable = forwardRef(function JellyTable({
  columns, rows, getRowId, getRowLabel, caption, sort, onSortChange,
  selectedKeys, onSelectionChange, isRowDisabled = () => false,
  emptyMessage = 'No rows to show.', loading = false, tone = 'info', className, style,
}, forwardedRef) {
  const materialStyle = useJellyToneStyle(tone);
  const generated = useId();
  const captionId = `jb-table-caption-${generated}`;
  const [localSort, setLocalSort] = useState(null);
  const [localSelection, setLocalSelection] = useState([]);
  const selectionEnabled = selectedKeys !== undefined || typeof onSelectionChange === 'function';
  const selection = selectedKeys ?? localSelection;
  const selected = new Set(selection);
  const currentSort = sort === undefined ? localSort : sort;
  const entries = rows.map((row, index) => ({ row, index, id: getRowId ? getRowId(row, index) : row.id, disabled: isRowDisabled(row) }));
  if (selectionEnabled) {
    const ids = entries.map(entry => entry.id);
    if (ids.some(id => typeof id !== 'string' && typeof id !== 'number') || new Set(ids).size !== ids.length) {
      throw new Error('JellyTable selection requires unique row.id values or a getRowId function.');
    }
  }
  const shown = sort === undefined && currentSort
    ? [...entries].sort((a, b) => {
      const comparison = compareValues(a.row[currentSort.key], b.row[currentSort.key]);
      return (currentSort.direction === 'desc' ? -comparison : comparison) || a.index - b.index;
    })
    : entries;
  const enabledKeys = entries.filter(entry => !entry.disabled).map(entry => entry.id);
  const selectedCount = enabledKeys.filter(key => selected.has(key)).length;
  const allSelected = enabledKeys.length > 0 && selectedCount === enabledKeys.length;
  const mixed = selectedCount > 0 && !allSelected;
  const changeSelection = next => {
    if (selectedKeys === undefined) setLocalSelection(next);
    onSelectionChange?.(next);
  };
  const changeSort = column => {
    const next = { key: column.key, direction: currentSort?.key === column.key && currentSort.direction === 'asc' ? 'desc' : 'asc' };
    if (sort === undefined) setLocalSort(next);
    onSortChange?.(next);
  };
  const cellCount = Math.max(1, columns.length + (selectionEnabled ? 1 : 0));

  return <div data-gel-surface="table" data-gel-tone={tone} data-gel-sampled="true" className={cx('jb-table-shell', className)} style={{ ...materialStyle, ...style }}>
    <div className="jb-table-loading-status" role="status">{loading ? 'Loading rows' : ''}</div>
    <div className="jb-table-scroll" role="region" aria-labelledby={captionId} tabIndex={0}>
      <table ref={forwardedRef} className="jb-table" aria-busy={loading || undefined}>
        <caption id={captionId}>{caption}</caption>
        <thead><tr data-gel-surface="row" data-gel-tone={tone} data-gel-sampled="true">
          {selectionEnabled && <th scope="col" className="jb-table-selection-cell"><TableCheckbox tone={tone} aria-label="Select all rows on this page"
            checked={allSelected} mixed={mixed} disabled={loading || enabledKeys.length === 0}
            onChange={() => {
              const next = new Set(selection);
              enabledKeys.forEach(key => { if (allSelected) next.delete(key); else next.add(key); });
              changeSelection([...next]);
            }} /></th>}
          {columns.map(column => <th key={column.key} scope="col" style={{ textAlign: column.align || 'left' }}
            aria-sort={currentSort?.key === column.key ? (currentSort.direction === 'asc' ? 'ascending' : 'descending') : undefined}>
            {column.sortable ? <button type="button" className="jb-table-sort" disabled={loading} onClick={() => changeSort(column)}>
              <span>{column.header}</span><span aria-hidden="true" className="jb-table-sort-mark">{currentSort?.key === column.key ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
            </button> : column.header}
          </th>)}
        </tr></thead>
        <tbody>{loading ? <tr><td colSpan={cellCount} className="jb-table-state"><span aria-hidden="true" className="jb-table-loading-lines"><span /><span /><span /></span></td></tr>
          : shown.length === 0 ? <tr><td colSpan={cellCount} className="jb-table-state">{emptyMessage}</td></tr>
            : shown.map(({ row, index, id, disabled }, visualIndex) => {
              const defaultLabel = row.name ?? row.label ?? id;
              const rowLabel = getRowLabel ? getRowLabel(row, index) : typeof defaultLabel === 'string' || typeof defaultLabel === 'number' ? String(defaultLabel) : `Row ${index + 1}`;
              return <tr data-gel-surface="row" data-gel-tone={tone} data-gel-sampled="true" key={id == null ? index : `${typeof id}:${id}`} data-selected={selectionEnabled && selected.has(id) ? 'true' : undefined} className={disabled ? 'jb-table-row-disabled' : undefined}>
                {selectionEnabled && <td className="jb-table-selection-cell"><TableCheckbox tone={tone} aria-label={`Select ${rowLabel}`} checked={selected.has(id)} disabled={disabled}
                  onChange={event => { const next = new Set(selection); if (event.currentTarget.checked) next.add(id); else next.delete(id); changeSelection([...next]); }} /></td>}
                {columns.map(column => <td key={column.key} style={{ textAlign: column.align || 'left' }}>
                  <span className="jb-table-cell-content">{column.render ? column.render(row[column.key], row, visualIndex) : row[column.key]}</span>
                </td>)}
              </tr>;
            })}</tbody>
      </table>
    </div>
  </div>;
});
