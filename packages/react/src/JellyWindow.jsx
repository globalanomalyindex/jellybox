import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react';
import { useJellyTransition } from './SelectionContour.jsx';
import { JellySurface } from './components.jsx';
import { windowPresentation } from './renderer/window-motion.js';
import './window-motion.css';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/** One persistent volume. Only its reading content changes at assimilation. */
export function useJellyWindow(viewKey, { surfaceRef, contentRef, reducedMotion = false, onFrame } = {}) {
  const previous = useRef(viewKey);
  const immediate = reducedMotion || previous.current == null || viewKey == null;
  const transition = useJellyTransition(viewKey, {
    reducedMotion: immediate,
    onFrame: snapshot => {
      const material = windowPresentation(snapshot);
      const surface = surfaceRef?.current, content = contentRef?.current;
      if (surface) {
        surface.dataset.gelWindow = snapshot.phase;
        surface.dataset.gelWindowDepth = String(material.depth);
        surface.dataset.gelWindowMix = String(snapshot.colorProgress);
        surface.style.setProperty('--jb-window-depth', String(material.depth));
        surface.style.setProperty('--jb-window-density', String(material.density));
      }
      if (content) content.style.opacity = String(material.contentOpacity);
      onFrame?.({ ...snapshot, ...material });
    },
  });
  useBrowserLayoutEffect(() => { previous.current = viewKey; }, [viewKey]);
  return transition;
}

export const JellyWindow = forwardRef(function JellyWindow({ viewKey, children, tone = 'info', reducedMotion = false, onFrame, className = '', ...props }, ref) {
  const surface = useRef(null), content = useRef(null);
  const motion = useJellyWindow(viewKey, { surfaceRef: surface, contentRef: content, reducedMotion, onFrame });
  const stale = !Object.is(motion.visibleKey, viewKey);
  return <JellySurface {...props} tone={tone} className={`jb-window ${className}`} data-gel-window="idle"
    ref={node => { surface.current = node; if (typeof ref === 'function') ref(node); else if (ref) ref.current = node; }}>
    <div ref={node => { content.current = node; if (node) node.inert = stale; }} className="jb-window-content" aria-hidden={stale || undefined}>
      {typeof children === 'function' ? children(motion.visibleKey) : children}
    </div>
  </JellySurface>;
});
