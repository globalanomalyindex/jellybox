import { forwardRef } from 'react';
import { JellyButton } from './components.jsx';

const STATES = {
  idle: { label: 'Generate', tone: 'action', path: 'm8 2 1.5 4.5L14 8l-4.5 1.5L8 14 6.5 9.5 2 8l4.5-1.5Z' },
  loading: { label: 'Generating', tone: 'info', path: 'M8 2a6 6 0 1 1-6 6 M8 5v3l2 2' },
  success: { label: 'Generated', tone: 'success', path: 'm3 8 3 3 7-7' },
  error: { label: 'Try again', tone: 'danger', path: 'm4 4 8 8 M12 4l-8 8' },
  warning: { label: 'Review required', tone: 'warning', path: 'M8 2 1 14h14Z M8 6v3 M8 11v.5' },
};

/** State is owned by the application; this control never invents completion. */
export const JellyActivityButton = forwardRef(function JellyActivityButton({ status = 'idle', progress, children, disabled, className = '', ...props }, ref) {
  const state = STATES[status] || STATES.idle;
  const busy = status === 'loading';
  const bounded = Number.isFinite(progress) ? Math.max(0, Math.min(100, progress)) : undefined;
  return <JellyButton {...props} ref={ref} tone={state.tone} disabled={disabled} loading={busy}
    data-gel-activity={status} data-gel-progress={busy ? bounded : undefined}
    className={`jb-activity ${className}`}>
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={state.path} /></svg>
    <span>{children ?? state.label}{busy && bounded !== undefined ? ` ${Math.round(bounded)}%` : ''}</span>
  </JellyButton>;
});
