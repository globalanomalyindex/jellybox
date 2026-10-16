import { useEffect, useRef, useState } from 'react';
import { createOptics } from './renderer/optics.js';
import { DEFAULT_MATERIAL } from './renderer/material.js';
import { SEMANTIC_COLORS } from './tokens.js';
import { MOTION } from './renderer/motion.js';
import { intersectRect, pickSurfaces } from './renderer/surface-layout.js';

// One optional optical scene per visible workbench. Semantics remain native DOM.
export function JellyScene({ children, params = DEFAULT_MATERIAL, tone = 'action', active = true, defer = false, className = '', style }) {
  const root = useRef(null);
  const canvas = useRef(null);
  const latest = useRef({ params, tone, active });
  const refresh = useRef(() => {});
  latest.current = { params: { ...DEFAULT_MATERIAL, ...params }, tone, active };
  const [live, setLive] = useState(false);
  const [nearby, setNearby] = useState(!defer);
  useEffect(() => {
    if (!defer) { setNearby(true); return; }
    const observer = new IntersectionObserver(([entry]) => setNearby(entry.isIntersecting), { rootMargin: '120px' });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [defer]);
  useEffect(() => { refresh.current(); }, [tone, active]);
  useEffect(() => {
    if (!nearby) { setLive(false); return; }
    const node = root.current;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    let bounds = { width: 1, height: 1, panel: null, bubbles: [], selections: [] };
    let canvasBounds = { x: 0, y: 0 };
    let pending = true;
    let measuredPanel = null;
    let movingUntil = 0, nextId = 0;
    const identities = new WeakMap();
    const projections = new Map();
    const forced = matchMedia('(forced-colors: active)');
    const cleanProjections = () => { projections.forEach(({ canvas }) => canvas.remove()); projections.clear(); };
    const idOf = el => { if (!identities.has(el)) identities.set(el, `surface-${++nextId}`); return identities.get(el); };
    const clearClaims = () => node.querySelectorAll('[data-gel-rendered], [data-gel-selection-rendered]').forEach(el => {
      if (el.closest('.jb-scene') !== node) return;
      delete el.dataset.gelRendered; delete el.dataset.gelSelectionRendered;
    });
    const rgb = name => (SEMANTIC_COLORS[name] || SEMANTIC_COLORS.action).rgb;
    const visible = el => { const inert = el.closest('[inert]'); return !el.closest('[hidden]') && (!inert || inert.classList.contains('jb-window-content')) && el.getClientRects().length > 0; };
    // Clip the actual mesh, not its measured shape: partial scroll visibility
    // must not create a new rounded end or let glass leak across a dialog header.
    const clipOf = el => {
      let clip = { x: 0, y: 0, width: innerWidth, height: innerHeight };
      for (let parent = el.parentElement; parent && parent !== node; parent = parent.parentElement) {
        const css = getComputedStyle(parent), r = parent.getBoundingClientRect();
        const clipX = /auto|scroll|hidden|clip/.test(css.overflowX);
        const clipY = /auto|scroll|hidden|clip/.test(css.overflowY);
        if (clipX || clipY) clip = intersectRect(clip, {
          x: clipX ? r.x + parent.clientLeft : clip.x,
          y: clipY ? r.y + parent.clientTop : clip.y,
          width: clipX ? parent.clientWidth : clip.width,
          height: clipY ? parent.clientHeight : clip.height,
        });
      }
      return clip;
    };
    const box = el => {
      const r = el.getBoundingClientRect();
      return { x: r.x - canvasBounds.x, y: r.y - canvasBounds.y, width: r.width, height: r.height,
        cornerRadius: Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24, r.height / 2) };
    };
    const measure = () => {
      const rootBounds = node.getBoundingClientRect();
      const menusInView = [...node.querySelectorAll('.jb-dropdown-list:not([hidden])')].map(el => el.getBoundingClientRect());
      const popupBottom = menusInView.reduce((bottom, rect) => Math.max(bottom, rect.bottom), rootBounds.bottom);
      const extraTop = rootBounds.top - menusInView.reduce((top, rect) => Math.min(top, rect.top), rootBounds.top);
      const canvasHeight = `${Math.max(rootBounds.height + 64, popupBottom - rootBounds.top + 64) + extraTop}px`;
      if (canvas.current.style.height !== canvasHeight) canvas.current.style.height = canvasHeight;
      canvas.current.style.top = `${-32 - extraTop}px`;
      canvas.current.style.setProperty('--jb-canvas-overflow-top', `${extraTop}px`);
      canvas.current.style.setProperty('--jb-canvas-overflow', `${Math.max(0, popupBottom - rootBounds.bottom)}px`);
      canvasBounds = canvas.current.getBoundingClientRect();
      const panel = [...node.querySelectorAll('[data-gel-panel]')].find(el => el.closest('.jb-scene') === node && visible(el));
      measuredPanel = panel;
      const candidates = [...node.querySelectorAll('[data-gel-surface]')].filter(el => el.closest('.jb-scene') === node && visible(el)).map(el => {
        const r = el.getBoundingClientRect(), clip = clipOf(el);
        return { el, kind: el.dataset.gelSurface || 'control', clip, visibleRect: intersectRect(r, clip) };
      });
      const chosen = pickSurfaces(candidates);
      const surfaces = chosen.map(item => item.el);
      const selectedSelector = '[data-gel-option][aria-checked="true"], [data-gel-option][aria-selected="true"], [data-gel-option][aria-pressed="true"]';
      const selectedOf = group => group.querySelector(group.dataset.gelSelectionMode === 'active' ? '[data-gel-option][data-active="true"]' : selectedSelector);
      const groups = [...node.querySelectorAll('[data-gel-group]')].filter(group => group.closest('.jb-scene') === node && visible(group) && selectedOf(group) && (surfaces.includes(selectedOf(group)) || group.dataset.gelConnected === 'true' && surfaces.includes(group.parentElement.querySelector('.jb-dropdown-shell')))).sort((a, b) => Number(b.classList.contains('jb-dropdown-list')) - Number(a.classList.contains('jb-dropdown-list'))).slice(0, 2);
      const claimed = new Set(forced.matches ? [] : [...surfaces, panel].filter(Boolean));
      node.querySelectorAll('[data-gel-rendered]').forEach(el => { if (el.closest('.jb-scene') === node && !claimed.has(el)) delete el.dataset.gelRendered; });
      claimed.forEach(el => { if (el.dataset.gelRendered !== 'true') el.dataset.gelRendered = 'true'; });
      node.querySelectorAll('[data-gel-selection-rendered]').forEach(el => { if (el.closest('.jb-scene') === node && !groups.includes(el)) delete el.dataset.gelSelectionRendered; });
      groups.forEach(el => { if (el.dataset.gelSelectionRendered !== 'true') el.dataset.gelSelectionRendered = 'true'; });
      bounds = {
        width: canvasBounds.width, height: canvasBounds.height,
        panel: panel ? { ...box(panel), color: rgb(panel.dataset.gelTone || latest.current.tone) } : null,
        bubbles: chosen.map(({ el, kind, clip }) => ({ ...box(el), id: idOf(el), kind, attached: Boolean(panel?.contains(el)),
          clip: { ...clip, x: clip.x - canvasBounds.x, y: clip.y - canvasBounds.y },
          layer: kind === 'menu' ? 4 : el.closest('.jb-dropdown-list') ? 5 : el.closest('.jb-table-shell') ? (kind === 'table' ? 1 : kind === 'row' ? 2 : 3) : kind === 'thumb' || el.closest('.jb-alert') && kind !== 'alert' ? 2 : kind === 'fill' ? 1.5 : 1,
          hover: el.dataset.gelHover === 'true' || el.dataset.active === 'true' ? 1 : 0,
          pressed: el.dataset.gelPressed === 'true' ? 1 : 0,
          grouped: el.hasAttribute('data-gel-option') && Boolean(el.closest('[data-gel-group]')),
          selected: !el.closest('[data-gel-group]') && (el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-selected') === 'true' || el.dataset.selected === 'true' || el.querySelector('input:checked')) ? true : false,
          flow: kind === 'menu' ? (() => {
            const group = el.parentElement.querySelector('[data-gel-connected="true"]');
            const active = group && selectedOf(group);
            if (!active) return null;
            const region = box(active), shell = box(el);
            // Size the dense pocket to its content, not an entire wide row. The
            // option hit target and committed check retain their original layout.
            let copyWidth = 0;
            active.querySelectorAll('.jb-dropdown-option-copy > *').forEach(copy => {
              const range = document.createRange(); range.selectNodeContents(copy);
              copyWidth = Math.max(copyWidth, range.getBoundingClientRect().width);
            });
            const width = Math.min(region.width - 8, Math.max(region.height * 2.6, copyWidth + 52));
            return { x: region.x + 4 + width / 2 - shell.x - shell.width / 2,
              y: shell.y + shell.height / 2 - region.y - region.height / 2,
              width, height: Math.max(20, region.height - 4), color: rgb(active.dataset.gelTone || 'info') };
          })() : null,
          color: el.dataset.gelSampled ? getComputedStyle(el).getPropertyValue('--jb-rgb').trim().split(/\s+/).map(c => Number(c) / 255) : rgb(el.dataset.gelHover === 'true' && el.dataset.gelHighlight || el.dataset.gelTone || latest.current.tone), colorSampled: Boolean(el.dataset.gelSampled), opacity: el.matches(':disabled') ? .4 : 1,
        })),
        selections: groups.filter(group => group.dataset.gelConnected !== 'true').flatMap(group => {
          const selected = selectedOf(group);
          return selected ? [{ ...box(selected), id: group.dataset.gelGroup, key: selected.dataset.gelKey,
            color: rgb(selected.dataset.gelTone || latest.current.tone), opacity: 1, attached: Boolean(panel?.contains(group)), layer: group.classList.contains('jb-dropdown-list') ? 6 : 2, clip: { ...clipOf(selected), x: clipOf(selected).x - canvasBounds.x, y: clipOf(selected).y - canvasBounds.y } }] : [];
        }),
      };
      // Copy the already rendered popup pixels into its DOM stacking layer.
      // This covers underlying HTML without another WebGL context or light pass.
      const menus = new Set(surfaces.filter(el => el.dataset.gelSurface === 'menu'));
      projections.forEach((entry, el) => { if (!menus.has(el)) { entry.canvas.remove(); projections.delete(el); } });
      menus.forEach(el => {
        let entry = projections.get(el);
        if (!entry) {
          const projection = document.createElement('canvas'); projection.className = 'jb-material-projection';
          projection.setAttribute('aria-hidden', 'true'); el.prepend(projection);
          entry = { canvas: projection, context: projection.getContext('2d', { alpha: false }) };
          projections.set(el, entry);
        }
        entry.rect = box(el);
        entry.localWidth = el.offsetWidth;
        entry.localHeight = el.offsetHeight;
        entry.canvas.style.top = `${el.scrollTop - 1}px`;
      });
      pending = false;
    };
    const invalidate = () => { pending = true; };
    refresh.current = invalidate;
    const resize = new ResizeObserver(invalidate);
    resize.observe(node);
    const mutations = new MutationObserver(records => {
      if (records.some(record => !record.target.closest?.('.jb-selection-svg') && !record.target.matches?.('.jb-material-projection, .jb-optical-canvas') && !(record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(child => child.classList?.contains('jb-material-projection'))) && !(record.type === 'attributes' && record.attributeName === 'style' && (record.target.hasAttribute('data-gel-window') || record.target.classList.contains('jb-window-content'))))) invalidate();
    });
    mutations.observe(node, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['aria-checked', 'aria-selected', 'aria-pressed', 'data-gel-hover', 'data-gel-pressed', 'style', 'data-gel-tone', 'disabled', 'hidden', 'inert', 'data-active', 'data-selected'] });
    window.addEventListener('resize', invalidate);
    window.addEventListener('scroll', invalidate, { passive: true, capture: true });
    media.addEventListener('change', invalidate);
    forced.addEventListener('change', invalidate);
    const animateBounds = () => { movingUntil = performance.now() + MOTION.recoil + 40; invalidate(); };
    node.addEventListener('animationstart', animateBounds, true);
    node.addEventListener('transitionrun', animateBounds, true);
    node.addEventListener('jellybox:motion', animateBounds, true);
    const respond = event => {
      const el = event.target.closest('[data-gel-surface]') || event.target.closest('.jb-slider')?.querySelector('.jb-range-thumb');
      if (!el || !node.contains(el) || ['badge', 'alert', 'track', 'table', 'row', 'menu'].includes(el.dataset.gelSurface) || el.matches(':disabled, [aria-disabled="true"]')) return;
      if (event.relatedTarget instanceof Node && el.contains(event.relatedTarget)) return;
      if (event.type === 'pointerover') el.dataset.gelPointer = 'true';
      if (event.type === 'focusin') el.dataset.gelFocus = 'true';
      if (event.type === 'pointerout') { el.dataset.gelPointer = 'false'; el.dataset.gelPressed = 'false'; }
      if (event.type === 'focusout') el.dataset.gelFocus = 'false';
      el.dataset.gelHover = String(el.dataset.gelPointer === 'true' || el.dataset.gelFocus === 'true');
      if (event.type === 'pointerdown') el.dataset.gelPressed = 'true';
      if (event.type === 'pointerup' || event.type === 'pointercancel') el.dataset.gelPressed = 'false';
      invalidate();
    };
    const events = ['pointerover', 'pointerout', 'pointerdown', 'pointerup', 'pointercancel', 'focusin', 'focusout'];
    events.forEach(type => node.addEventListener(type, respond));
    let renderer;
    try {
      renderer = createOptics(canvas.current, {
        getScene: () => {
          if (!latest.current.active) return null;
          if (forced.matches) { clearClaims(); cleanProjections(); return null; }
          if (pending || performance.now() < movingUntil) measure();
          if (canvasBounds.bottom < 0 || canvasBounds.top > innerHeight) return null;
          return { dpr: devicePixelRatio, params: latest.current.params,
            reducedMotion: media.matches, buttons: [], ...bounds, panel: bounds.panel ? { ...bounds.panel, windowDepth: Number(measuredPanel?.dataset.gelWindowDepth ?? 1) } : null };
        },
        onAfterRender: () => projections.forEach(({ canvas: target, context, rect, localWidth, localHeight }) => {
          if (!context || !rect || rect.width < 1 || rect.height < 1) return;
          const source = canvas.current, ratio = source.width / bounds.width;
          const w = Math.max(1, Math.round(rect.width * ratio)), h = Math.max(1, Math.round(rect.height * ratio));
          if (target.width !== w || target.height !== h) { target.width = w; target.height = h; }
          target.style.width = `${localWidth}px`; target.style.height = `${localHeight}px`;
          context.drawImage(source, rect.x * ratio, rect.y * ratio, rect.width * ratio, rect.height * ratio, 0, 0, w, h);
        }),
        onError: () => { clearClaims(); cleanProjections(); setLive(false); },
      });
      setLive(canvas.current.dataset.renderer === 'three-webgl');
    } catch { setLive(false); }
    return () => {
      renderer?.destroy(); resize.disconnect(); mutations.disconnect();
      clearClaims(); cleanProjections();
      node.removeEventListener('animationstart', animateBounds, true);
      node.removeEventListener('transitionrun', animateBounds, true);
      node.removeEventListener('jellybox:motion', animateBounds, true);
      forced.removeEventListener('change', invalidate);
      window.removeEventListener('resize', invalidate); window.removeEventListener('scroll', invalidate, true);
      media.removeEventListener('change', invalidate);
      events.forEach(type => node.removeEventListener(type, respond));
    };
  }, [nearby]);
  return <div ref={root} className={`jb-scene ${live ? 'jb-live' : ''} ${params.motion === 0 ? 'jb-paused' : ''} ${className}`} style={style}>
    <canvas ref={canvas} className="jb-optical-canvas" aria-hidden="true" />
    {children}
  </div>;
}
