import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Lightbulb, X, ArrowCounterClockwise } from '@phosphor-icons/react';
import { JellyButton, JellySlider, JellySwitch } from '../packages/react/src/index.js';
import { defaultLightForViewport, moveLight } from './lighting.js';

export function LightRig({ light, setLight, fieldRef, onOpenChange, animateTrack = false }) {
  const bulb = useRef(null), editor = useRef(null), gesture = useRef(null), suppressClick = useRef(false);
  const [dragging, setDragging] = useState(false), [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState({ x: 24, y: 100 });
  const close = (restore = true) => { setOpen(false); if (restore) bulb.current?.focus({ preventScroll: true }); };
  useEffect(() => { onOpenChange?.(open); }, [open, onOpenChange]);
  useLayoutEffect(() => {
    if (!open) return;
    const position = () => {
      const r = bulb.current.getBoundingClientRect(), h = editor.current?.offsetHeight || 420;
      const width = Math.min(320, innerWidth - 24);
      // Open toward the outer edge, leaving the three buttons visible while tuning.
      const preferredX = r.left + r.width / 2 < innerWidth / 2 ? r.left - width - 16 : r.right + 16;
      const x = Math.max(12, Math.min(innerWidth - width - 12, preferredX));
      let y = r.top - 24;
      if (x < r.right && x + width > r.left && r.bottom + 16 + h < innerHeight - 12) y = r.bottom + 16;
      setPlacement({ x, y: Math.max(12, Math.min(innerHeight - h - 12, y)) });
    };
    position();
    const outside = event => { if (!editor.current?.contains(event.target) && !bulb.current?.contains(event.target)) close(false); };
    const key = event => { if (event.key === 'Escape' && !event.defaultPrevented) { event.stopImmediatePropagation(); event.preventDefault(); close(); } };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', key);
    window.addEventListener('resize', position); window.addEventListener('scroll', position, { passive: true });
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', key); window.removeEventListener('resize', position); window.removeEventListener('scroll', position); };
  }, [open, light.x, light.y]);
  useEffect(() => { if (open) editor.current?.querySelector('input')?.focus({ preventScroll: true }); }, [open]);
  const start = event => {
    if (event.button !== 0) return;
    const bounds = fieldRef.current.getBoundingClientRect();
    gesture.current = { pointer: event.pointerId, x: event.clientX, y: event.clientY, light: { x: light.x, y: light.y }, bounds, moved: false };
    suppressClick.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = event => {
    const g = gesture.current; if (!g || g.pointer !== event.pointerId) return;
    const dx = event.clientX - g.x, dy = event.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) < 5) return;
    if (!g.moved) { g.moved = true; setDragging(true); setOpen(false); }
    setLight(previous => ({ ...previous, ...moveLight(g.light, dx, dy, g.bounds) }));
  };
  const end = event => {
    const g = gesture.current; if (!g || g.pointer !== event.pointerId) return;
    suppressClick.current = g.moved || event.type === 'pointercancel'; gesture.current = null; setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const keyboard = event => {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!direction) return;
    event.preventDefault();
    const step = event.shiftKey ? 32 : 8, bounds = fieldRef.current.getBoundingClientRect();
    setLight(previous => ({ ...previous, ...moveLight(previous, direction[0] * step, direction[1] * step, bounds) }));
  };
  return <>
    <div className="light-field" ref={fieldRef}>
      <div className="light-anchor" data-edge={light.x > .8 ? 'right' : light.x < .2 ? 'left' : undefined} style={{ left: `${light.x * 100}%`, top: `${light.y * 100}%` }}>
        <button ref={bulb} type="button" className={`light-bulb ${dragging ? 'is-dragging' : ''} ${light.enabled ? '' : 'is-off'}`} aria-label="Move light or open lighting options" aria-describedby="light-instructions" aria-haspopup="dialog" aria-expanded={open} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={keyboard} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } setOpen(value => !value); }}><Lightbulb size={26} weight={light.enabled ? 'fill' : 'regular'} /></button>
        <span className="light-hint" aria-hidden="true">{dragging ? 'follow the shadow' : 'drag me · click to tune'}</span>
      </div>
    </div>
    <span className="sr-only" id="light-instructions">Drag to move the light. Arrow keys move it; Shift moves farther. Enter opens lighting options.</span>
    {open && createPortal(<section ref={editor} className="lighting-editor" role="dialog" aria-modal="false" aria-labelledby="lighting-title" style={{ left: placement.x, top: placement.y }}>
      <header><div><h2 id="lighting-title">A little light.</h2><p>Every change lands on the jelly.</p></div><button type="button" className="light-close" onClick={() => close()} aria-label="Close lighting options"><X size={20} /></button></header>
      <JellySwitch tone="action" label="Light on" checked={light.enabled} onCheckedChange={enabled => setLight(previous => ({ ...previous, enabled }))} />
      <div className="light-settings">{[
        ['intensity', 'Brightness', 20, 160, 100, '%'], ['height', 'Height', 120, 700, 1, ''], ['softness', 'Softness', 0, 100, 100, '%'], ['warmth', 'Warmth', 0, 100, 100, '%'],
      ].map(([key, label, min, max, scale, suffix]) => <JellySlider animateTrack={animateTrack && open} key={key} label={label} tone="action" min={min} max={max} value={Math.round(light[key] * scale)} formatValue={v => key === 'height' ? `${v}` : `${v}${suffix}`} onValueChange={v => setLight(previous => ({ ...previous, [key]: v / scale }))} />)}</div>
      <p className="light-note">Lower light, longer shadows. Softer light, gentler edges.</p>
      <JellyButton size="sm" onClick={() => setLight(defaultLightForViewport(innerWidth))}><ArrowCounterClockwise size={16} /> Reset light</JellyButton>
    </section>, document.body)}
  </>;
}
