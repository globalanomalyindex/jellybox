import { Component, lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Drop, SlidersHorizontal, SquaresFour, X } from '@phosphor-icons/react';
import { createOptics } from './optics.js';
import { MOTION, motionStyle } from './motion.js';
import { controlPigment } from '../packages/react/src/tokens.js';
import { assistTarget, scrollFrame } from '../packages/react/src/interaction.js';
import { useSavedLook } from './useSavedLook.js';
import { DEFAULT_EXPERIMENT, DEFAULT_COLORS } from './experiment.js';
import { useDockedToolbar } from './useDockedToolbar.js';
import { useJellyColor } from '../packages/react/src/useMaterialColor.js';
import { intersectRect, pickSurfaces } from '../packages/react/src/renderer/surface-layout.js';
import { PanelSkeleton } from './PanelSkeleton.jsx';
import { LightRig } from './LightRig.jsx';
import { DesignStory } from './DesignStory.jsx';
import { ProgressiveScrollEdge, usePagePresentation } from './PagePresentation.jsx';
import { defaultLightForViewport } from './lighting.js';
import { tabOutlinePath } from '../packages/react/src/renderer/tab-surface.js';
import { applyJellyInk, clearJellyInk, inkElementRect, jellyReadingInk } from '../packages/react/src/contrast.js';
import { stepJellyResponse } from '../packages/react/src/renderer/motion.js';
import { JellyButton, JellySwitch, useJellyWindow, SEMANTIC_COLORS } from '../packages/react/src/index.js';

const loadPanels = () => import('./PanelContent.jsx');
const PanelContent = lazy(loadPanels);

const DEFAULTS = DEFAULT_EXPERIMENT;
const PALETTES = [
  { name: 'Glass blue', colors: [...DEFAULT_COLORS] },
  { name: 'Candy', colors: ['#dd3c88', '#a789ef', '#ffb251'] },
  { name: 'Lagoon', colors: ['#136aee', '#39c9bd', '#a9e4ed'] },
  { name: 'Citrus', colors: ['#ff784b', '#ffd653', '#a8e533'] },
];
const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16) / 255);
const PANELS = [{ name: 'Explore', Icon: SquaresFour }, { name: 'Color', Icon: Drop }, { name: 'Material', Icon: SlidersHorizontal }];

function folderAttention(region) {
  // Keep the group's invitation separate from the child's existing owner,
  // including retained slider focus or a captured scrub outside the folder.
  const children = region.querySelector('.jelly-details-content');
  const enabled = node => node && children?.contains(node) && !node.closest('[inert], [disabled], [aria-disabled="true"], .jb-disabled');
  const open = region.dataset.open === 'true';
  const childActive = open && [...(children?.querySelectorAll('[data-gel-engaged="true"], [data-gel-dragging="true"], [data-gel-hover="true"], [data-gel-pressed="true"], :focus-visible') || [])].some(enabled);
  return { hover: region.dataset.densityHover === 'true', childActive };
}

function syncTabOutline(surface, tab, depth = 1, shell = null) {
  if (!surface || !tab) return;
  const w = shell?.width ?? surface.offsetWidth, h = shell?.height ?? surface.offsetHeight;
  const svg = surface.querySelector('svg');
  surface.style.setProperty('--window-bulk', shell ? (1 - shell.openness) ** 3 : 0);
  if (shell) {
    const bounds = surface.getBoundingClientRect();
    svg.style.width = `${w}px`; svg.style.height = `${h + 48}px`;
    svg.style.transform = `translate(${shell.x - scrollX - w / 2 - bounds.x}px, ${shell.y - scrollY - h / 2 - bounds.y}px)`;
  } else { svg.style.removeProperty('width'); svg.style.removeProperty('height'); svg.style.removeProperty('transform'); }
  const amount = tab.attachment ?? (tab.engaged ? Math.max(0, Math.min(1, depth)) : 0);
  const shape = { ...tab, width: Math.min(tab.width, w * .7), lift: tab.lift * amount, amount };
  const key = [w, h, shell?.radius, tab.width, shape.lift, tab.neck?.pull, tab.neck?.pinch, tab.neck?.wobble].join(',');
  if (surface.dataset.outlineKey === key) return;
  surface.dataset.outlineKey = key;
  surface.querySelector('svg').setAttribute('viewBox', `0 -48 ${w} ${h + 48}`);
  surface.querySelector('path').setAttribute('d', tabOutlinePath(w, h, shell?.radius ?? 30, shape));
}

class PanelBoundary extends Component {
  state = { error: false };
  static getDerivedStateFromError() { return { error: true }; }
  render() {
    return this.state.error ? <div className="panel-error"><h3>This panel couldn’t load.</h3><p>Your material settings are still here. Reload the page to try again.</p><JellyButton onClick={() => location.reload()}>Reload page</JellyButton></div> : this.props.children;
  }
}

export function App({ active = true }) {
  useEffect(() => {
    const normalize = () => {
      const storyTarget = document.getElementById(location.hash.slice(1));
      if (location.hash !== '#/' && location.hash !== '' && !storyTarget?.closest('.design-story')) history.replaceState(null, '', '#/');
    };
    normalize(); window.addEventListener('hashchange', normalize); return () => window.removeEventListener('hashchange', normalize);
  }, []);
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const studyRef = useRef(null);
  const heroRef = useRef(null);
  const toolbarRef = useRef(null);
  const buttonRefs = useRef([]);
  const { edgeRef, presentation } = usePagePresentation(appRef, buttonRefs);
  const panelSurfaceRef = useRef(null);
  const panelInnerRef = useRef(null);
  const storyScopeRef = useRef(null);
  const storyDirty = useRef(true);
  const bubbleElements = useRef([]);
  const measureRef = useRef(() => {});
  const movingUntil = useRef(0);
  const contentRevealTimer = useRef(null);
  const sceneRef = useRef({ pointer: { x: -100, y: -100, visible: false }, parallax: { x: 0, y: 0 }, lastSceneTime: 0, hovers: [0, 0, 0], pointerHovers: [0, 0, 0], focusHovers: [0, 0, 0], pressed: [0, 0, 0], rects: [], bubbles: [], panelRect: null, hero: null, params: DEFAULTS, selected: null, closing: false, reducedMotion: false });
  const [params, setParams] = useState(DEFAULTS);
  const [panel, setPanel] = useState(null);
  const [closing, setClosing] = useState(false);
  const [openingVersion, setOpeningVersion] = useState(0);
  const [colors, setColors] = useState([...DEFAULT_COLORS]);
  const [light, setLight] = useState(() => defaultLightForViewport(innerWidth));
  const lightFieldRef = useRef(null);
  const [lightOpen, setLightOpen] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [paused, setPaused] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [activeButton, setActiveButton] = useState(null);
  const [windowOrigin, setWindowOrigin] = useState();
  const [panelPreferences, setPanelPreferences] = useState({ colorTarget: 0, shapeOpen: false });
  const dismissedButton = useRef(null);
  const savedLook = useSavedLook({ params, colors, light, paused }, look => { setParams(look.params); setColors(look.colors); setLight(look.light); setPaused(look.paused); });

  // One pigment clock survives opening, withdrawal, and late palette edits.
  const windowColor = useJellyColor(closing || panel === null ? controlPigment('action', 'rest') : colors[panel], { origin: windowOrigin });
  const { capture: captureToolbar, frame: toolbarFrame } = useDockedToolbar(buttonRefs, panel, closing, reducedMotion, windowColor, panelSurfaceRef,
    duration => { movingUntil.current = Math.max(movingUntil.current, performance.now() + duration + 80); },
    () => { if (fallback) measureRef.current(); },
    () => { setPanel(null); setClosing(false); sceneRef.current.panelRect = null; });

  const windowMotion = useJellyWindow(panel, { surfaceRef: panelSurfaceRef, contentRef: panelInnerRef, reducedMotion,
    onFrame: frame => {
      sceneRef.current.windowDepth = frame.depth;
      if (fallback) syncTabOutline(panelSurfaceRef.current, sceneRef.current.tab, frame.depth, toolbarFrame.current?.shell);
    },
  });
  const windowMaterial = { '--jb-color': windowColor, '--jb-rgb': rgb(windowColor).map(c => Math.round(c * 255)).join(' ') };
  const visiblePanel = windowMotion.visibleKey ?? panel;
  const switching = visiblePanel !== panel;
  sceneRef.current.params = { ...params, motion: paused ? 0 : params.motion };
  sceneRef.current.colors = colors;
  sceneRef.current.windowColor = windowColor;
  sceneRef.current.light = light;
  sceneRef.current.nudge = nudge;
  sceneRef.current.selected = closing ? null : panel;
  sceneRef.current.tabOwner = panel;
  sceneRef.current.closing = closing;
  sceneRef.current.reducedMotion = reducedMotion;
  sceneRef.current.active = active;
  sceneRef.current.fallback = fallback;

  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReducedMotion(media.matches);
    change(); media.addEventListener('change', change);
    const rectOf = el => { const r = el?.getBoundingClientRect(); return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null; };
    let surfaceIdentity = 0;
    const surfaceIds = new WeakMap();
    const inkNodes = new Map();
    const surfaceId = el => { if (!surfaceIds.has(el)) surfaceIds.set(el, `control-${++surfaceIdentity}`); return surfaceIds.get(el); };
    const measure = () => {
      const s = sceneRef.current;
      s.measuredScroll = { x: scrollX, y: scrollY };
      s.hero = rectOf(heroRef.current);
      s.lightField = rectOf(lightFieldRef.current);
      s.rects = buttonRefs.current.map(rectOf);
      s.panelRect = rectOf(panelSurfaceRef.current);
      const surface = panelSurfaceRef.current, owner = buttonRefs.current[s.tabOwner];
      if (surface && owner) {
        const compact = innerWidth <= 700, inset = compact ? 12 : 20;
        s.tab = { width: toolbarFrame.current?.tabWidth ?? (inset + owner.offsetWidth), lift: compact ? 20 : 24, centerX: inset + owner.offsetWidth / 2, centerY: 12, engaged: s.selected !== null, attachment: toolbarFrame.current?.attachment, neck: toolbarFrame.current?.neck };
        syncTabOutline(surface, s.tab, s.windowDepth ?? 1, toolbarFrame.current?.shell);
      } else s.tab = null;
      const densityRegion = panelInnerRef.current?.querySelector('.panel-view:not(.is-outgoing) [data-density-region]');
      const folder = densityRegion?.dataset.densityRegion === 'folder';
      const densityAttention = densityRegion ? folderAttention(densityRegion) : null;
      // Measure the mounted content's natural height, not the animated reveal.
      // The optical profile already applies the disclosure phase once.
      const expandedHeight = folder ? [densityRegion.querySelector(':scope > h4'), densityRegion.querySelector(':scope > .jelly-details-summary'), densityRegion.querySelector('.jelly-details-content')]
        .reduce((sum, el) => sum + (el?.getBoundingClientRect().height ?? 0), 0) : undefined;
      s.densityRegion = densityRegion ? { ...rectOf(densityRegion), folder, expandedHeight,
        open: densityRegion.dataset.open === 'true', hover: densityAttention.hover, childActive: densityAttention.childActive,
        phase: Number(getComputedStyle(densityRegion).getPropertyValue('--jb-density-phase').trim() || (densityRegion.dataset.open === 'true' ? '1' : '0')),
        pigment: s.colors[s.tabOwner], opacity: Number(getComputedStyle(densityRegion.closest('.panel-view')).opacity) } : null;
      const panelOpacity = panelInnerRef.current ? Number(getComputedStyle(panelInnerRef.current.closest('.jelly-panel')).opacity) : 1;
      const viewport = { x: 0, y: -160, width: innerWidth, height: innerHeight + 320 };
      const mainInView = s.panelRect && intersectRect(s.panelRect, viewport).height > 1;
      const mass = [...(storyScopeRef.current?.querySelectorAll('[data-story-mass]') || [])].find(el => intersectRect(rectOf(el), viewport).height > 1);
      const storyMass = !mainInView ? mass : null;
      storyScopeRef.current?.querySelectorAll('[data-story-mass]').forEach(el => {
        if (el === storyMass && !s.fallback) el.dataset.gelRendered = 'true';
        else delete el.dataset.gelRendered;
      });
      const storyRegion = storyMass?.querySelector('[data-density-region]');
      const storyAttention = storyRegion ? folderAttention(storyRegion) : null;
      s.storyPanel = storyMass ? { ...rectOf(storyMass), pigment: storyMass.dataset.massPigment } : null;
      s.storyDensity = storyRegion ? { ...rectOf(storyRegion), folder: true,
        expandedHeight: [storyRegion.querySelector(':scope > h4'), storyRegion.querySelector(':scope > .jelly-details-summary'), storyRegion.querySelector('.jelly-details-content')].reduce((sum, el) => sum + (el?.getBoundingClientRect().height ?? 0), 0),
        open: storyRegion.dataset.open === 'true', hover: storyAttention.hover, childActive: storyAttention.childActive,
        phase: Number(getComputedStyle(storyRegion).getPropertyValue('--jb-density-phase')),
        concentration: Number(storyRegion.closest('[data-story-concentration]')?.dataset.storyConcentration ?? 1),
        pigment: storyMass.dataset.massPigment, opacity: 1 } : null;
      const desktopLamp = storyScopeRef.current?.querySelector('[data-desktop-lamp="true"]');
      const lampAnchor = desktopLamp?.querySelector('[data-lamp-anchor="true"]');
      s.spotlight = lampAnchor && intersectRect(rectOf(desktopLamp), viewport).height > 1 ? { ...rectOf(lampAnchor), lampHeight: Number(desktopLamp.dataset.lampHeight), intensity: Number(desktopLamp.dataset.lampBrightness) / 100 } : null;
      const parentElement = storyMass || (mainInView ? panelInnerRef.current : null);
      const allSurfaces = [...bubbleElements.current, ...(storyScopeRef.current?.querySelectorAll('[data-gel-surface]') || [])].filter(el => el.isConnected && !el.closest('[hidden]'));
      s.storyTraces = [...(storyScopeRef.current?.querySelectorAll('[data-motion-loop="running"] [data-gel-motion-preview]') || [])];
      const chosen = pickSurfaces(allSurfaces.map(el => ({ el, kind: el.dataset.gelSurface || 'control', visibleRect: intersectRect(rectOf(el), viewport) })));
      const claims = new Set(s.fallback ? [] : chosen.map(item => item.el));
      inkNodes.clear();
      buttonRefs.current.forEach((el, i) => { if (el) inkNodes.set(`primary-${i}`, el); });
      s.primaryInk = buttonRefs.current.map(el => el ? { ...inkElementRect(el), ink: jellyReadingInk(el) } : null);
      allSurfaces.forEach(el => { if (claims.has(el)) { el.dataset.gelRendered = 'true'; inkNodes.set(surfaceId(el), el); } else { delete el.dataset.gelRendered; clearJellyInk(el); } });
      s.controlsDragging = Boolean(appRef.current?.querySelector('[data-gel-dragging="true"]'));
      s.bubbles = chosen.map(({ el }) => ({ ...rectOf(el),
        id: surfaceId(el),
        ink: jellyReadingInk(el),
        inkRect: ['track', 'fill', 'thumb'].includes(el.dataset.gelSurface) ? null : inkElementRect(el),
        attached: Boolean(parentElement?.contains(el)),
        contact: Boolean(el.closest('.story-demo')),
        layer: el.dataset.gelSurface === 'thumb' ? 2 : el.dataset.gelSurface === 'fill' ? 1.5 : 1,
        disabled: el.disabled || Boolean(el.closest('[inert]')) || el.closest('.jb-slider')?.classList.contains('jb-disabled') || el.dataset.gelAssist === 'false',
        assist: el.dataset.gelSurface === 'thumb' && el.dataset.gelPointer === 'true' || el.matches('button') && !el.closest('[data-gel-group]'),
        headerControl: el.classList.contains('dock-close'),
        feedback: el.dataset.gelFeedback,
        activity: el.dataset.gelActivity,
        activityColor: el.style.getPropertyValue('--jb-target-color').trim() || undefined,
        activityPhase: el.dataset.gelMaterialPhase === undefined ? undefined : Number(el.dataset.gelMaterialPhase),
        progress: el.dataset.gelProgress === undefined ? undefined : Number(el.dataset.gelProgress),
        kind: el.dataset.gelSurface || 'control',
        emphasis: el.closest('.jb-slider-compact') ? Number(getComputedStyle(el).getPropertyValue('--jb-slider-emphasis')) : 1,
        grouped: Boolean(el.closest('[data-gel-group]')),
        bulb: Boolean(el.closest('[data-gel-bulbs]')),
        color: el.dataset.gelSampled ? getComputedStyle(el).getPropertyValue('--jb-rgb').trim().split(/\s+/).map(c => Number(c) / 255) : SEMANTIC_COLORS[el.dataset.gelTone]?.rgb,
        colorSampled: Boolean(el.dataset.gelSampled),
        hover: el.dataset.gelHover === 'true' ? 1 : 0, pressed: el.dataset.gelPressed === 'true' ? 1 : 0,
        selected: !el.closest('[data-gel-group]') && (el.getAttribute('aria-pressed') === 'true' || el.getAttribute('aria-expanded') === 'true'),
        opacity: (getComputedStyle(el).visibility === 'hidden' ? 0 : Number(getComputedStyle(el).opacity)) * (el.closest('.panel-view') ? Number(getComputedStyle(el.closest('.panel-view')).opacity) * panelOpacity : 1)
          * (el.closest('.jelly-details-reveal') ? Number(getComputedStyle(el.closest('.jelly-details-reveal')).opacity) : 1),
        clip: el.closest('.jelly-details-clip') ? rectOf(el.closest('.jelly-details-clip')) : undefined,
        cornerRadius: Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24, el.offsetHeight / 2),
      }));
      storyDirty.current = false;
      s.selections = [...(panelInnerRef.current?.querySelectorAll('.panel-view:not(.is-outgoing) [data-gel-group]') || [])].flatMap(group => {
        const selected = group.querySelector('[data-gel-option][aria-checked="true"], [data-gel-option][aria-selected="true"], [data-gel-option][aria-pressed="true"]');
        return selected ? [{ ...rectOf(selected), id: group.dataset.gelGroup, key: selected.dataset.gelKey,
          cornerRadius: parseFloat(getComputedStyle(selected).borderTopLeftRadius) || 25,
          color: SEMANTIC_COLORS[selected.dataset.gelTone]?.rgb,
          opacity: Number(getComputedStyle(group.closest('.panel-view')).opacity) * panelOpacity }] : [];
      });
    };
    measureRef.current = measure;
    const observer = new ResizeObserver(measure);
    observer.observe(heroRef.current);
    buttonRefs.current.forEach(el => el && observer.observe(el));
    window.addEventListener('resize', measure);
    const scroll = () => {
      const s = sceneRef.current, previous = s.measuredScroll || { x: scrollX, y: scrollY };
      const dx = previous.x - scrollX, dy = previous.y - scrollY;
      for (const rect of [s.hero, s.lightField, s.panelRect, s.densityRegion, s.storyPanel, s.storyDensity, s.spotlight, ...s.rects, ...s.bubbles, ...s.bubbles.map(r => r.clip), ...(s.selections || [])]) if (rect) { rect.x += dx; rect.y += dy; }
      if (dx || dy) storyDirty.current = true;
      s.measuredScroll = { x: scrollX, y: scrollY };
    };
    window.addEventListener('scroll', scroll, { passive: true });
    const pointer = e => {
      const wasVisible = sceneRef.current.pointer.visible;
      if (e.pointerType === 'touch') { sceneRef.current.pointer.visible = false; if (wasVisible) measure(); return; }
      sceneRef.current.pointer = { x: e.clientX, y: e.clientY, visible: Boolean(e.target.closest('.jelly-workbench, .story-demo')) };
      if (wasVisible !== sceneRef.current.pointer.visible) measure();
    };
    const leave = () => {
      const s = sceneRef.current;
      s.pointer.visible = false; s.pointerHovers.fill(0); s.pressed.fill(0);
      s.hovers = s.focusHovers.slice();
      const focused = s.focusHovers.findIndex(Boolean);
      setActiveButton(focused < 0 ? null : focused);
      measure();
    };
    window.addEventListener('pointermove', pointer, { passive: true });
    document.addEventListener('pointerleave', leave);
    window.addEventListener('blur', leave);
    measure();
    let canvasFrame = null;
    let optics;
    try {
      setFallback(false);
      optics = createOptics(canvasRef.current, {
        getScene: () => {
          const s = sceneRef.current;
          if (!s.active) return null;
          const now = performance.now();
          const delta = Math.min(.055, Math.max(.001, (now - s.lastSceneTime) / 1000));
          s.lastSceneTime = now;
          scroll();
          // Material assistance is local; native targets never drift with it.
          s.parallax.x = 0; s.parallax.y = 0;
          const assistEnabled = s.pointer.visible && !s.closing && !s.reducedMotion && s.params.motion > 0;
          const candidates = [...s.rects.map((r, i) => r && ({ ...r, disabled: s.selected === i || !!toolbarFrame.current })), ...s.bubbles.map(r => ({ ...r, disabled: r.disabled || !r.assist || r.opacity <= .001 || r.headerControl && !!toolbarFrame.current, assistLimit: r.kind === 'thumb' ? 5 : 3 }))];
          const assistanceBlocked = !!toolbarFrame.current || s.closing || s.controlsDragging || s.pressed.some(Boolean) || s.bubbles.some(r => r.pressed);
          const assisted = assistEnabled && !assistanceBlocked ? assistTarget(candidates, s.pointer) : null;
          const assist = index => assisted?.index === index ? { assistX: assisted.x, assistY: assisted.y, assistStrength: assisted.strength } : { assistX: 0, assistY: 0, assistStrength: 0 };
          canvasFrame = scrollFrame(canvasFrame, scrollY, innerHeight);
          canvasRef.current.style.top = `${canvasFrame.top}px`;
          canvasRef.current.style.height = `${canvasFrame.height}px`;
          canvasRef.current.dataset.documentTop = String(canvasFrame.top);
          const canvasY = scrollY - canvasFrame.top;
          const project = rect => rect && ({ ...rect, y: rect.y + canvasY, ...(rect.clip ? { clip: { ...rect.clip, y: rect.clip.y + canvasY } } : {}) });
          // Measure transformed shell only while a container transition runs.
          if (storyDirty.current || now < movingUntil.current) measure();
          // Only the visible explanatory moving surfaces need fresh transformed
          // bounds; do not remeasure every story control on every chart frame.
          for (const preview of s.storyTraces || []) {
            const trace = s.bubbles.find(surface => surface.id === surfaceId(preview));
            if (trace) Object.assign(trace, rectOf(preview));
          }
          const colors = s.colors.map((color, i) => rgb(controlPigment('action', s.selected === i ? 'selected' : s.pressed[i] ? 'pressed' : s.hovers[i] ? 'highlighted' : 'rest', color)));
          const transfer = toolbarFrame.current;
          const shell = transfer?.shell;
          const age = (now - s.nudge) / 1000;
          const impulse = s.nudge && !s.reducedMotion && s.params.motion > 0 && age < 1 ? Math.max(0, Math.sin(age * Math.PI)) * Math.exp(-age * 2) * 2 : 0;
          const lightField = s.lightField;
          const nearby = r => r && r.y + r.height > -320 && r.y < innerHeight + 320;
          let spotlight = null;
          if (s.spotlight) {
            const target = project(s.spotlight);
            const response = s.spotlightResponse ||= {};
            const options = { duration: MOTION.material, curve: MOTION.gather, instant: s.reducedMotion || s.params.motion === 0 };
            spotlight = { x: stepJellyResponse(response, 'x', target.x + target.width / 2 - 30, delta, options), y: stepJellyResponse(response, 'y', target.y - 60, delta, options), height: target.lampHeight, intensity: target.intensity, softness: .55, warmth: .5, enabled: true };
          } else s.spotlightResponse = null;
          return { width: innerWidth, height: canvasFrame.height, documentTop: canvasFrame.top, viewportTop: canvasY, viewportHeight: innerHeight, dpr: Math.min(devicePixelRatio, innerWidth < 700 ? 1.3 : 1.5) * Math.sqrt(innerHeight / canvasFrame.height), pointer: project(s.pointer), parallax: s.parallax, hero: project(s.hero),
            buttons: s.rects.map((r, i) => nearby(r) ? project({ ...r, ...assist(i), arrival: presentation.current.arrival[i], ...(transfer ? { width: transfer.poses[i].width, height: transfer.poses[i].height, x: r.x + (r.width - transfer.poses[i].width) / 2, y: r.y + (r.height - transfer.poses[i].height) / 2, merge: transfer.poses[i].merge, neckStrain: transfer.poses[i].strain || 0, ...(transfer.materialOnly ? { x: transfer.poses[i].x - scrollX - transfer.poses[i].width / 2, y: transfer.poses[i].y - scrollY - transfer.poses[i].height / 2 } : {}), transferring: true } : {}), hover: Math.max(s.hovers[i], s.selected === i ? 0.35 : 0), pressed: s.pressed[i], stir: impulse, docked: s.selected !== null, tabbed: s.selected === i, color: colors[i] }) : null),
            panel: s.storyPanel ? project({ ...s.storyPanel, id: 'story-density', density: s.storyDensity ? project(s.storyDensity) : null, hover: 0, color: rgb(s.storyPanel.pigment), colorSampled: true, cornerRadius: 30, windowDepth: 1, boundsSampled: true }) : nearby(s.panelRect) && panelSurfaceRef.current ? project({ ...s.panelRect, id: 'primary-window', density: s.densityRegion ? { ...project(s.densityRegion), opacity: s.densityRegion.opacity * Number(panelSurfaceRef.current.parentElement.style.getPropertyValue('--window-reveal') || 1) } : null, hover: shell?.closing ? 0 : 0.12, pressed: 0, stir: 0, color: rgb(transfer?.color ?? s.windowColor), colorSampled: true, cornerRadius: shell?.radius ?? 30, windowDepth: shell ? 1 : transfer ? .62 + .38 * transfer.attachment : s.windowDepth ?? 1, tab: s.tab, ...(shell ? { x: shell.x - scrollX - shell.width / 2, y: shell.y - scrollY - shell.height / 2, width: shell.width, height: shell.height, boundsSampled: true, morph: shell } : {}) }) : null,
            bubbles: s.bubbles.map((r, i) => project({ ...r, ...assist(i + s.rects.length), opacity: r.headerControl && s.closing ? 0 : r.opacity })), selections: s.selections?.map(project), assistanceBlocked, params: s.params, reducedMotion: s.reducedMotion,
            light: spotlight || (lightField ? project({ ...s.light, x: lightField.x + lightField.width * s.light.x, y: lightField.y + lightField.height * s.light.y }) : null),
            lightAnchor: spotlight ? { x: spotlight.x + 30, y: spotlight.y + 60 } : s.rects.length ? project({ x: s.rects.reduce((sum, r) => sum + r.x + r.width / 2, 0) / s.rects.length, y: s.rects.reduce((sum, r) => sum + r.y + r.height / 2, 0) / s.rects.length }) : undefined,
            contrastTargets: [...(s.primaryInk || []).map((r, i) => r && ({ ...r, id: `primary-${i}` })), ...s.bubbles.filter(r => r.inkRect).map(r => ({ ...r.inkRect, ink: r.ink, id: r.id, reactive: Boolean(r.activity && r.activityPhase < 1) }))].filter(Boolean).map(project),
            scrollEdge: edgeRef.current ? { height: presentation.current.edgeHeight, strength: Number(getComputedStyle(edgeRef.current).opacity) } : null };
        },
        onError: error => { console.warn('Optical renderer:', error); inkNodes.forEach(clearJellyInk); document.documentElement.classList.remove('gel-bubbles-ready'); setFallback(true); },
        onContrast: readings => readings.forEach(result => applyJellyInk(inkNodes.get(result.id), result)),
      });
      document.documentElement.classList.add('optics-ready');
      if (canvasRef.current.dataset.bubblesReady === 'true') document.documentElement.classList.add('gel-bubbles-ready');
    } catch (error) { console.warn('Optical canvas unavailable.', error); setFallback(true); }
    return () => {
      optics?.destroy(); observer.disconnect(); inkNodes.forEach(clearJellyInk);
      media.removeEventListener('change', change);
      window.removeEventListener('resize', measure); window.removeEventListener('scroll', scroll);
      window.removeEventListener('pointermove', pointer); document.removeEventListener('pointerleave', leave); window.removeEventListener('blur', leave);
      document.documentElement.classList.remove('optics-ready');
      document.documentElement.classList.remove('gel-bubbles-ready');
      clearTimeout(contentRevealTimer.current);
    };
  }, [createOptics]);

  useLayoutEffect(() => {
    if (panel === null) { sceneRef.current.panelRect = null; bubbleElements.current = []; sceneRef.current.densityRegion = null; measureRef.current(); return; }
    const surface = panelSurfaceRef.current;
    const refreshBubbles = () => {
      bubbleElements.current = [...toolbarRef.current.querySelectorAll('.dock-close[data-gel-surface]'), ...panelInnerRef.current.querySelectorAll('.panel-view:not(.is-outgoing) [data-gel-surface]')];
      measureRef.current();
    };
    refreshBubbles();
    const observer = new ResizeObserver(refreshBubbles);
    observer.observe(surface);
    observer.observe(panelInnerRef.current);
    const mutations = new MutationObserver(refreshBubbles);
    mutations.observe(panelInnerRef.current, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-checked', 'aria-selected', 'aria-expanded', 'aria-disabled', 'disabled', 'inert', 'style', 'data-gel-hover', 'data-gel-pointer', 'data-gel-pressed', 'data-gel-state', 'data-open', 'data-density-hover', 'data-gel-engaged', 'data-gel-dragging'] });
    const close = toolbarRef.current.querySelector('.dock-close');
    if (close) mutations.observe(close, { attributes: true, attributeFilter: ['style', 'data-gel-hover', 'data-gel-pointer', 'data-gel-pressed'] });
    const followTransition = event => { const duration = event.target.closest('[data-density-region]') ? MOTION.densityGather : MOTION.recoil; movingUntil.current = Math.max(movingUntil.current, performance.now() + duration + 80); };
    panelInnerRef.current.addEventListener('transitionrun', followTransition);
    const revealTimer = setTimeout(() => {
      if (!closing && surface.getBoundingClientRect().bottom > innerHeight - 28) surface.parentElement.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
    }, reducedMotion ? 0 : MOTION.windowOpen);
    return () => { observer.disconnect(); mutations.disconnect(); panelInnerRef.current?.removeEventListener('transitionrun', followTransition); clearTimeout(revealTimer); };
  }, [visiblePanel, reducedMotion, openingVersion, closing]);

  useLayoutEffect(() => { measureRef.current(); }, [params, colors, light, active, fallback]);

  useEffect(() => {
    const node = storyScopeRef.current;
    const invalidate = () => { storyDirty.current = true; };
    const resize = new ResizeObserver(invalidate);
    resize.observe(node);
    const mutations = new MutationObserver(invalidate);
    mutations.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'aria-pressed', 'aria-expanded', 'aria-disabled', 'disabled', 'inert', 'data-open', 'data-density-hover', 'data-gel-hover', 'data-gel-pointer', 'data-gel-pressed', 'data-gel-engaged', 'data-gel-dragging', 'data-story-concentration', 'data-gel-activity', 'data-gel-progress', 'data-gel-material-phase', 'data-motion-loop', 'data-desktop-lamp', 'data-lamp-anchor', 'data-lamp-height', 'data-lamp-brightness'] });
    const transition = () => { movingUntil.current = Math.max(movingUntil.current, performance.now() + MOTION.densityGather + 80); invalidate(); };
    node.addEventListener('transitionrun', transition);
    node.addEventListener('jellybox:motion', transition);
    invalidate();
    return () => { resize.disconnect(); mutations.disconnect(); node.removeEventListener('transitionrun', transition); node.removeEventListener('jellybox:motion', transition); };
  }, []);

  const gelEvent = (event, type, value) => {
    // Touch may leave native :hover behind; refresh after clearing assistance.
    const pointerChanged = event.pointerType === 'touch' && sceneRef.current.pointer.visible;
    if (event.pointerType === 'touch') sceneRef.current.pointer.visible = false;
    // The slider owns its rounded hover zones and native focus/drag feedback.
    if (event.target.closest('.jb-slider')) {
      if (pointerChanged) measureRef.current();
      return;
    }
    const element = event.target.closest('[data-gel-surface]');
    // Crossing an icon or label inside the same lens is not a new hover.
    if (!element || type === 'gelHover' && event.relatedTarget instanceof Node && element.contains(event.relatedTarget)) {
      if (pointerChanged) measureRef.current();
      return;
    }
    element.dataset[type] = String(value);
    if (type === 'gelHover' && !value) element.dataset.gelPressed = 'false';
    measureRef.current();
  };

  const closePanel = () => {
    if (panel === null || closing) return;
    const index = panel;
    buttonRefs.current[index]?.focus({ preventScroll: true });
    captureToolbar(true);
    // Focus is retained, but dismissal releases the enlarged hover footprint.
    dismissedButton.current = index;
    sceneRef.current.focusHovers.fill(0); sceneRef.current.pointerHovers.fill(0);
    sceneRef.current.hovers.fill(0); sceneRef.current.pressed.fill(0);
    setActiveButton(null);
    clearTimeout(contentRevealTimer.current); setClosing(true);
  };
  useEffect(() => {
    if (panel === null || lightOpen) return;
    const key = e => { if (e.key === 'Escape' && !e.defaultPrevented) { e.preventDefault(); closePanel(); } };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [panel, closing, reducedMotion, lightOpen]);
  const openPanel = index => {
    dismissedButton.current = null;
    if (panel === index && !closing) { closePanel(); return; }
    if (panel === null) setWindowOrigin({ color: getComputedStyle(buttonRefs.current[index]).getPropertyValue('--jb-color').trim() });
    captureToolbar();
    if (panel === null || closing) setOpeningVersion(v => v + 1);
    setClosing(false); setPanel(index);
    setAnnouncement(`${PANELS[index].name} panel opened.`);
  };
  const hover = (index, value, source = 'pointer') => {
    const s = sceneRef.current;
    if (dismissedButton.current === index) {
      if (!value) dismissedButton.current = null;
      else if (source === 'pointer') dismissedButton.current = null;
      else return;
    }
    s[source === 'focus' ? 'focusHovers' : 'pointerHovers'][index] = value;
    const pointerIndex = s.pointerHovers.findIndex(Boolean);
    const focusedIndex = s.focusHovers.findIndex(Boolean);
    const active = pointerIndex >= 0 ? pointerIndex : focusedIndex;
    s.hovers = s.hovers.map((_, i) => i === active ? 1 : 0);
    setActiveButton(active < 0 ? null : active);
  };
  const pressed = (index, value) => { sceneRef.current.pressed[index] = value; };
  const buttonEvents = i => ({
    onPointerEnter: () => { hover(i, 1); loadPanels().catch(() => {}); }, onPointerLeave: () => { hover(i, 0); pressed(i, 0); },
    onFocus: e => { hover(i, e.currentTarget.matches(':focus-visible') ? 1 : 0, 'focus'); loadPanels().catch(() => {}); }, onBlur: () => { hover(i, 0, 'focus'); pressed(i, 0); },
    onPointerDown: () => pressed(i, 1), onPointerUp: () => pressed(i, 0), onPointerCancel: () => pressed(i, 0),
  });
  const effectiveActive = panel !== null && !closing ? panel : activeButton;
  const buttonState = i => `${effectiveActive === i ? 'is-active' : effectiveActive !== null ? 'is-neighbor' : ''} ${panel === i && !closing ? 'is-selected' : ''}`;


  const revealContent = () => {
    clearTimeout(contentRevealTimer.current);
    contentRevealTimer.current = setTimeout(() => {
      const surface = panelSurfaceRef.current;
      if (surface && surface.getBoundingClientRect().bottom > innerHeight - 28) surface.parentElement.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'instant' : 'smooth' });
    }, reducedMotion ? 0 : MOTION.windowOpen);
  };
  const panelView = index => <div className="panel-view" key={index}>
    <h2 className="sr-only">{PANELS[index].name}</h2>
    <PanelBoundary key={index}><Suspense fallback={<PanelSkeleton panel={index} />}>
      <PanelContent panel={index} params={params} setParams={setParams} defaults={DEFAULTS} reducedMotion={reducedMotion} onAnnounce={setAnnouncement} onReady={revealContent} onReset={reset} colors={colors} setColors={setColors} palettes={PALETTES} onNudge={() => setNudge(performance.now())} paused={paused} savedLook={savedLook} preferences={panelPreferences} setPreferences={setPanelPreferences} />
    </Suspense></PanelBoundary>
  </div>;

  const reset = () => { setParams({ ...DEFAULTS }); setColors([...DEFAULT_COLORS]); setLight(defaultLightForViewport(innerWidth)); setPaused(false); setPanelPreferences({ colorTarget: 0, shapeOpen: false }); setAnnouncement('Experiment reset.'); };
  return <><div ref={appRef} className={`app ${fallback ? 'fallback' : 'jb-live'} ${paused ? 'is-paused' : ''} ${params.motion === 0 ? 'is-still' : ''}`} style={{ ...motionStyle, '--button-size': params.size, '--button-spacing': `${params.spacing}px` }}>
    <div className="optical-viewport" aria-hidden="true"><canvas className="optical-canvas" ref={canvasRef} /></div>
    <header className="site-header"><nav aria-label="Project links"><a href="https://christopherfiore.net/" target="_blank" rel="noreferrer">Portfolio <span aria-hidden="true">↗</span></a><a href="https://christopherfiore.net/product-designs/jellybox/" target="_blank" rel="noreferrer">Case study <span aria-hidden="true">↗</span></a><a href="https://github.com/globalanomalyindex/jellybox" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a></nav></header>
    <main aria-label="JellyBox button experiment"><section ref={studyRef} className="material-stage" aria-label="Interactive JellyBox material experiment">
      <LightRig animateTrack={!reducedMotion} light={light} setLight={setLight} fieldRef={lightFieldRef} onOpenChange={setLightOpen} />
      <div className="hero" ref={heroRef}><h1 className="sr-only">JellyBox</h1><img className="jellybox-logo" src={`${import.meta.env.BASE_URL}brand/jellybox-logo.svg`} alt="" aria-hidden="true" /></div>
      <div className={`jelly-workbench ${panel !== null && !closing ? 'is-open' : ''} ${closing ? 'is-undocking' : ''}`}>
        {panel !== null && <div className="panel-surface" data-panel={visiblePanel} style={windowMaterial} ref={panelSurfaceRef} aria-hidden="true"><svg className="joined-tab-fallback" preserveAspectRatio="none"><defs><linearGradient id="tab-fallback-fill" x2=".5" y2="1"><stop stopColor="rgb(var(--jb-rgb) / calc(.52 + .35 * var(--window-bulk, 0)))" /><stop offset=".28" stopColor="color-mix(in srgb, rgb(var(--jb-rgb) / .9) calc(var(--window-bulk, 0) * 100%), rgb(245 250 252 / .8))" /><stop offset="1" stopColor="rgb(var(--jb-rgb) / calc(.15 + .6 * var(--window-bulk, 0)))" /></linearGradient></defs><path fill="url(#tab-fallback-fill)" /></svg></div>}
        <div className="jelly-toolbar" ref={toolbarRef} aria-label="Material controls">
          {(panel !== null && !closing ? [panel, ...[0, 1, 2].filter(i => i !== panel)] : [0, 1, 2]).map(i => {
            const { name, Icon } = PANELS[i];
            return <JellyButton tone="action" key={name} pigment={colors[i]} highlighted={activeButton === i && !closing} id={`trigger-${i}`} ref={el => buttonRefs.current[i] = el} className={`jelly ${['jelly-primary', 'jelly-clear', 'jelly-lime'][i]}  ${buttonState(i)}`} {...buttonEvents(i)} onClick={() => openPanel(i)} aria-label={name} aria-expanded={panel === i && !closing} aria-controls={panel === i ? 'jelly-panel' : undefined}><Icon size={22} /><span className="jelly-label">{name}</span></JellyButton>;
          })}
          {panel !== null && !closing && <JellyButton size="sm" tone="danger" variant="quiet" className="study-close dock-close" aria-label={`Close ${PANELS[panel].name} panel`} onClick={closePanel} disabled={closing}><X size={20} /></JellyButton>}
        </div>
        {panel !== null && <section id="jelly-panel" className={`jelly-panel panel-${panel} ${closing ? 'is-closing' : ''}`} role="region" aria-labelledby={`trigger-${panel}`} inert={closing}>
          <div className="panel-inner jb-window-content" ref={panelInnerRef} inert={switching} aria-hidden={switching || undefined}
            onPointerOver={e => gelEvent(e, 'gelHover', true)} onPointerOut={e => gelEvent(e, 'gelHover', false)}
            onPointerDown={e => gelEvent(e, 'gelPressed', true)} onPointerUp={e => gelEvent(e, 'gelPressed', false)} onPointerCancel={e => gelEvent(e, 'gelPressed', false)}
            onFocus={e => gelEvent(e, 'gelHover', true)} onBlur={e => gelEvent(e, 'gelHover', false)}>
            {panelView(visiblePanel)}
          </div>
        </section>}
      </div>
    </section>
    <div ref={storyScopeRef} onPointerOver={e => gelEvent(e, 'gelHover', true)} onPointerOut={e => gelEvent(e, 'gelHover', false)}
      onPointerDown={e => gelEvent(e, 'gelPressed', true)} onPointerUp={e => gelEvent(e, 'gelPressed', false)} onPointerCancel={e => gelEvent(e, 'gelPressed', false)}
      onFocus={e => gelEvent(e, 'gelHover', true)} onBlur={e => gelEvent(e, 'gelHover', false)}>
      <DesignStory motionEnabled={!paused && !reducedMotion && params.motion > 0} />
    </div>
    </main>
    <footer className="site-footer"><span>JellyBox <span className="footer-cross">—</span> by christopher robin fiore · MIT</span><JellySwitch tone="info" label="Continuous motion" checked={!paused} onCheckedChange={enabled => setPaused(!enabled)} /></footer>
    <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    <ProgressiveScrollEdge edgeRef={edgeRef} />
    {fallback && <p className="fallback-notice" role="status">Live glass is unavailable in this browser. All controls are still usable.</p>}
  </div></>;
}
