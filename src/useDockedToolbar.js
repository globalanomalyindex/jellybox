import { useLayoutEffect, useRef } from 'react';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';
import { sampleTabTransfer, sampleTabContinuation, sampleWindowMorph } from '../packages/react/src/renderer/tab-transfer.js';

const poseOf = node => {
  const r = node.getBoundingClientRect();
  return { x: r.x + r.width / 2 + scrollX, y: r.y + r.height / 2 + scrollY, width: r.width, height: r.height };
};
const shellOf = (pose, open) => ({ ...pose, radius: open ? 30 : pose.height / 2, openness: open ? 1 : 0,
  attachment: open ? 1 : 0, neck: { pull: 0, pinch: 0, wobble: 0 } });
const setSurfaceColor = (surface, color) => {
  if (!surface) return;
  surface.style.setProperty('--jb-color', color);
  surface.style.setProperty('--jb-rgb', [1, 3, 5].map(at => parseInt(color.slice(at, at + 2), 16)).join(' '));
};

// Native labels hold their destination anchors. One sampled optical carrier
// turns the selected pill into the window and gathers it back on close.
export function useDockedToolbar(buttonRefs, selected, closing, reducedMotion, color, surfaceRef, onMotion, onFrame, onClosed) {
  const origins = useRef(null), focused = useRef(null);
  const frame = useRef(null), raf = useRef(0), callbacks = useRef({ onMotion, onFrame, onClosed, color });
  callbacks.current = { onMotion, onFrame, onClosed, color };
  const clean = () => buttonRefs.current.forEach(node => {
    delete node.dataset.dockTransfer;
    for (const property of ['width', 'height', 'label', 'merge', 'x', 'y', 'content']) node.style.removeProperty(`--dock-${property}`);
  });
  const capture = (withdrawing = false) => {
    focused.current = buttonRefs.current.includes(document.activeElement) ? document.activeElement : null;
    const surface = surfaceRef.current;
    const workbench = buttonRefs.current[0]?.closest('.jelly-workbench');
    const content = workbench?.querySelector('.jelly-panel');
    origins.current = {
      layoutHeight: workbench?.getBoundingClientRect().height,
      contentTop: content && workbench ? content.getBoundingClientRect().top - workbench.getBoundingClientRect().top : 0,
      selected: closing ? null : selected, attachment: frame.current?.attachment ?? (selected === null ? 0 : 1), neck: frame.current?.neck || {},
      shell: frame.current?.shell || (surface ? { ...shellOf(poseOf(surface), true), attachment: frame.current?.attachment ?? 1, neck: frame.current?.neck || {} } : null),
      contentOpacity: frame.current?.contentOpacity ?? (surface ? Number(surface.parentElement.style.getPropertyValue('--window-reveal') || 1) : 0),
      tabWidth: frame.current?.tabWidth ?? ((innerWidth <= 700 ? 12 : 20) + (buttonRefs.current[selected]?.offsetWidth || 0)),
      poses: buttonRefs.current.map((node, i) => ({ ...poseOf(node),
        ...(frame.current ? { x: frame.current.poses[i].x, y: frame.current.poses[i].y } : {}),
        strain: frame.current?.poses[i].strain || 0,
        width: frame.current?.poses[i].width ?? node.offsetWidth,
        height: frame.current?.poses[i].height ?? node.offsetHeight,
        merge: frame.current?.poses[i].merge ?? (i === selected && !closing ? 1 : 0),
        label: frame.current?.poses[i].label ?? (i === selected && !closing ? 1 : 0),
      })),
    };
    // Pin before React removes the content from flow, so scroll anchoring never
    // observes the short closed layout between capture and the first frame.
    if (withdrawing && workbench) workbench.style.height = `${origins.current.layoutHeight}px`;
  };
  useLayoutEffect(() => {
    if (!origins.current && !reducedMotion) {
      if (selected === null) {
        const workbench = buttonRefs.current[0]?.closest('.jelly-workbench');
        workbench?.style.removeProperty('height');
        workbench?.style.removeProperty('--closing-content-top');
      }
      return;
    }
    cancelAnimationFrame(raf.current); clean(); frame.current = null;
    const source = origins.current; origins.current = null;
    const workbench = buttonRefs.current[0]?.closest('.jelly-workbench');
    if (!closing || reducedMotion) {
      workbench?.style.removeProperty('height');
      workbench?.style.removeProperty('--closing-content-top');
    }
    if (focused.current?.isConnected && document.activeElement === document.body) focused.current.focus({ preventScroll: true });
    const surface = surfaceRef.current;
    const region = surface?.parentElement.querySelector('.jelly-panel');
    region?.style.removeProperty('display');
    if (!source || reducedMotion || selected === null || !surface) {
      setSurfaceColor(surface, color);
      if (region) region.inert = closing;
      surface?.parentElement.style.setProperty('--window-reveal', closing ? 0 : 1);
      callbacks.current.onFrame?.();
      if (closing) callbacks.current.onClosed?.();
      return;
    }
    const destination = buttonRefs.current.map(node => ({ ...poseOf(node), label: node.classList.contains('is-active') ? 1 : 0 }));
    const closedHeight = workbench.querySelector('.jelly-toolbar').offsetHeight;
    if (closing) {
      workbench.style.height = `${source.layoutHeight}px`;
      workbench.style.setProperty('--closing-content-top', `${source.contentTop}px`);
    }
    const switching = !closing && source.selected !== null && source.selected !== selected;
    const duration = switching ? MOTION.tabTransfer : closing ? MOTION.windowClose : MOTION.windowOpen;
    const morphing = !switching || (source.shell && source.shell.openness < .999);
    const originShell = source.shell || shellOf(source.poses[selected], false);
    const pillHeight = closing ? destination[selected].height : originShell.pillHeight || source.poses[selected].height;
    const tabWidth = source.shell ? source.tabWidth : (innerWidth <= 700 ? 12 : 20) + destination[selected].width;
    const started = performance.now();
    const paint = time => {
      const progress = (time - started) / duration;
      const next = switching
        ? sampleTabTransfer(source.poses, destination, source.selected, selected, progress, source.attachment, source.neck)
        : sampleTabContinuation(source.poses, destination, closing ? null : selected, progress, source.attachment, source.neck);
      // Read the final layout, not a transformed DOM box. Lazy content may grow
      // while opening; the native reading surface remains unscaled throughout.
      const targetShell = closing ? shellOf(destination[selected], false) : shellOf(poseOf(surface), true);
      const morph = morphing ? sampleWindowMorph(originShell, targetShell, progress, !closing, source.contentOpacity) : null;
      if (morph) {
        next.shell = { ...morph.shell, pillHeight, closing };
        if (!switching) {
          next.attachment = morph.shell.attachment; next.neck = morph.shell.neck;
          // The window carrier owns this volume until it becomes the pill again.
          next.poses[selected].merge = 1;
        } else next.shell = { ...next.shell, neck: next.neck, attachment: next.attachment };
      }
      frame.current = { ...next, contentOpacity: morph?.contentOpacity ?? 1, materialOnly: true, tabWidth, color: callbacks.current.color };
      buttonRefs.current.forEach((node, i) => {
        const pose = next.poses[i], target = destination[i];
        node.dataset.dockTransfer = 'true';
        node.style.setProperty('--dock-x', `${pose.x - target.x}px`);
        node.style.setProperty('--dock-y', `${pose.y - target.y}px`);
        const travelling = !switching || i === source.selected || i === selected;
        const revealAt = closing ? .78 : switching ? .53 : .50;
        node.style.setProperty('--dock-content', travelling ? Math.max(0, Math.min(1, (next.progress - revealAt) / .12)) : 1);
        node.style.setProperty('--dock-width', `${pose.width}px`);
        node.style.setProperty('--dock-height', `${pose.height}px`);
        node.style.setProperty('--dock-label', pose.label);
        node.style.setProperty('--dock-merge', pose.merge);
      });
      surface.parentElement.style.setProperty('--window-reveal', morph ? morph.contentOpacity : 1);
      if (closing) {
        // Retire document space with the volume, not in one jump at unmount.
        const gather = sampleBezier(MOTION.withdraw, next.progress);
        workbench.style.height = `${source.layoutHeight + (closedHeight - source.layoutHeight) * gather}px`;
      }
      if (region) {
        region.inert = closing || Boolean(morph && morph.contentOpacity < .15);
        // Invisible absolute content must not keep the page's scroll extent
        // alive until unmount, then drop it in a single final frame.
        region.style.display = closing && morph?.contentOpacity === 0 ? 'none' : '';
      }
      setSurfaceColor(surface, frame.current.color);
      surface.dataset.tabTransfer = String(next.progress);
      callbacks.current.onFrame?.();
      if (next.progress < 1) raf.current = requestAnimationFrame(paint);
      else { clean(); frame.current = null; if (closing) callbacks.current.onClosed?.(); }
    };
    paint(started);
    callbacks.current.onMotion(duration);
  }, [selected, closing, reducedMotion]);
  useLayoutEffect(() => () => cancelAnimationFrame(raf.current), []);
  return { capture, frame };
}
