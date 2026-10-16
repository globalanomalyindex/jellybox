import { useEffect, useId, useRef, useState } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { useJellyControlStyle } from '../packages/react/src/useMaterialColor.js';
import { FOLDER_DENSITY } from '../packages/react/src/renderer/density-field.js';

// The fixed disclosure tab is the anchor; only its parent material expands.
export function JellyDetails({ title, summary, children, open: controlledOpen, onOpenChange, defaultOpen = false }) {
  const [internalOpen, setOpen] = useState(defaultOpen);
  const open = controlledOpen ?? internalOpen;
  const id = useId();
  const [hover, setHover] = useState(false), [focus, setFocus] = useState(false);
  const scrollHold = useRef(null);
  const releaseScroll = () => { scrollHold.current?.(); scrollHold.current = null; };
  const holdScroll = () => {
    // A reversal reuses the hold; briefly removing it could clamp scroll first.
    if (scrollHold.current) return;
    const app = document.querySelector('.app');
    if (!app || scrollY === 0) return;
    const previous = app.style.minHeight;
    // Keep the closing target under the pointer even at the document's end.
    // This space lives below the page content, never inside the jelly folder.
    app.style.minHeight = `max(100dvh, ${Math.ceil(scrollY + innerHeight + 1)}px)`;
    let holding = true;
    const release = () => {
      if (!holding) return;
      holding = false;
      app.style.minHeight = previous;
      if (scrollHold.current === release) scrollHold.current = null;
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchmove', release);
      window.removeEventListener('resize', release);
      window.removeEventListener('keydown', scrollKey);
    };
    const scrollKey = event => { if (['PageDown', 'PageUp', 'Home', 'End', 'ArrowDown', 'ArrowUp'].includes(event.key)) release(); };
    window.addEventListener('wheel', release, { passive: true, once: true });
    window.addEventListener('touchmove', release, { passive: true, once: true });
    window.addEventListener('resize', release, { once: true });
    window.addEventListener('keydown', scrollKey);
    scrollHold.current = release;
  };
  useEffect(() => releaseScroll, []);
  const material = useJellyControlStyle('info', open ? 'selected' : 'rest');
  const parts = typeof summary === 'string' ? summary.split(' · ') : null;
  return <section className="jelly-details" data-open={open} data-density-region="folder" data-density-hover={hover || focus}
    style={{ '--folder-handle-width': `${FOLDER_DENSITY.width}px`, '--folder-handle-height': `${FOLDER_DENSITY.handleHeight}px` }}
    onFocus={() => setFocus(true)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) { setFocus(false); releaseScroll(); } }}>
    <h4><button type="button" id={`${id}-trigger`} aria-expanded={open} aria-controls={id} aria-labelledby={`${id}-title`} aria-describedby={`${id}-summary`}
      data-density-handle="" style={material} className="jelly-details-trigger"
      onPointerEnter={() => setHover(true)} onPointerLeave={() => { setHover(false); if (!open) releaseScroll(); }}
      onClick={() => { if (open) holdScroll(); setOpen(!open); onOpenChange?.(!open); }}>
      <span className="jelly-details-title" id={`${id}-title`}>{title}</span>
      <span className="jelly-details-caret" aria-hidden="true"><CaretDown size={18} /></span>
    </button></h4>
    <small className="jelly-details-summary" id={`${id}-summary`}>{parts ? parts.map((part, index) => <span key={part}>{part}{index < parts.length - 1 ? ' · ' : ''}</span>) : summary}</small>
    <div className="jelly-details-reveal" id={id} role="region" aria-labelledby={`${id}-trigger`} aria-hidden={!open} inert={!open}>
      <div className="jelly-details-clip"><div className="jelly-details-content">{children}</div></div>
    </div>
  </section>;
}
