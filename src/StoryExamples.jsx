import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, LinkSimple, Minus } from '@phosphor-icons/react';
import { JellyBadge, JellyButton, JellySlider } from '../packages/react/src/index.js';
import { createJellyPalette } from '../packages/react/src/color.js';
import { useJellyColor } from '../packages/react/src/useMaterialColor.js';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';
import { JellyDetails } from './JellyDetails.jsx';
import { motionLoopFrames, colorGroupState } from './story-examples.js';

// WAAPI owns chart transforms; native controls remain immediate.
function useVisibleLoop(ref, enabled) {
  const [visible, setVisible] = useState(false), [awake, setAwake] = useState(!document.hidden);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting && entry.intersectionRatio >= .35), { threshold: [0, .35] });
    observer.observe(ref.current);
    const change = () => setAwake(!document.hidden);
    document.addEventListener('visibilitychange', change);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', change); };
  }, [ref]);
  return visible && awake && enabled;
}

const RESPONSES = [
  { name: 'Open', duration: MOTION.windowOpen, curve: MOTION.gather },
  { name: 'Close', duration: MOTION.windowClose, curve: MOTION.withdraw },
  { name: 'Slider', duration: MOTION.sliderTravel, curve: MOTION.sliderTravelCurve },
  { name: 'Recoil', duration: MOTION.recoil, curve: MOTION.recoilCurve },
];

function MotionTrace({ response, motionEnabled }) {
  const ref = useRef(null);
  const running = useVisibleLoop(ref, motionEnabled);
  const trace = useMemo(() => {
    const points = Array.from({ length: 81 }, (_, i) => [40 + i / 80 * 480, 140 - sampleBezier(response.curve, i / 80) * 96]);
    const lengths = [0];
    points.slice(1).forEach(([x, y], i) => lengths.push(lengths[i] + Math.hypot(x - points[i][0], y - points[i][1])));
    return { path: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' '), lengths };
  }, [response.curve]);
  useEffect(() => {
    if (!running) return;
    const { frames, duration } = motionLoopFrames(response);
    const start = document.timeline.currentTime;
    const progress = time => {
      const at = Math.max(0, Math.min(80, time * 80)), i = Math.min(79, Math.floor(at));
      return (trace.lengths[i] + (trace.lengths[i + 1] - trace.lengths[i]) * (at - i)) / trace.lengths[80];
    };
    const animations = [
      ['.chart-playhead', frame => ({ transform: `translateX(${frame.time * 480}px)` })],
      ['.chart-dot', frame => ({ transform: `translate(${frame.time * 480}px, ${-frame.value * 96}px)` })],
      ['.chart-progress', frame => ({ strokeDashoffset: 1 - progress(frame.time) })],
      ['.chart-material-carrier', frame => ({ transform: `translateX(${frame.value * 100}%)` })],
      ['.chart-jelly', frame => ({ transform: `scale(${1 + frame.strain}, ${1 - frame.strain})` })],
    ].map(([selector, properties]) => {
      const animation = ref.current.querySelector(selector).animate(frames.map(frame => ({ offset: frame.offset, ...properties(frame) })), { duration, iterations: Infinity, easing: 'linear' });
      // Sequential animate() calls otherwise establish independent origins.
      animation.startTime = start;
      return animation;
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [running, response, trace]);
  return <div ref={ref} data-motion-loop={running ? 'running' : 'paused'}>
    <div className="story-demo-readout"><span>{response.duration} ms</span><code>{response.curve}</code></div>
    <div className="motion-diagram"><svg className="motion-chart" viewBox="0 0 560 204" role="img" aria-label={response.name + ' response over ' + response.duration + ' milliseconds'}>
      <path className="chart-guide" d="M40 20V140H520 M40 44H520" />
      <text x="30" y="48" textAnchor="end">100%</text><text x="30" y="144" textAnchor="end">0</text>
      <text x="40" y="162">0 ms</text><text x="520" y="162" textAnchor="end">{response.duration} ms</text>
      <path className="chart-response" d={trace.path} />
      <path className="chart-progress" d={trace.path} pathLength="1" />
      <path className="chart-playhead" d="M40 20V140" />
      <circle className="chart-dot" cx="40" cy="140" r="5" />
      <path className="chart-rail" d="M40 182V194 M450 182V194" />
    </svg>
    <span className="chart-material-carrier" aria-hidden="true"><span className="chart-jelly" data-gel-surface="thumb" data-gel-motion-preview="" data-gel-assist="false" /></span></div>
  </div>;
}

export function MotionExample({ motionEnabled }) {
  const [selected, setSelected] = useState(3);
  return <figure className="story-demo" aria-labelledby="motion-example-title">
    <figcaption><strong id="motion-example-title">A curve has a job</strong></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Motion response">
      {RESPONSES.map((response, i) => <JellyButton key={response.name} size="sm" tone="action" selected={selected === i} onClick={() => setSelected(i)}>{response.name}</JellyButton>)}
    </div>
    <MotionTrace key={selected} response={RESPONSES[selected]} motionEnabled={motionEnabled} />
  </figure>;
}

export function DensityExample({ motionEnabled }) {
  const [strength, setStrength] = useState(85), [included, setIncluded] = useState(['Image', 'Color']);
  const count = included.length;
  return <figure className="story-demo" aria-labelledby="density-example-title">
    <figcaption><strong id="density-example-title">Structure from the same material</strong></figcaption>
    <div className="story-mass" data-story-mass="" data-mass-pigment="#91d2f5">
      <div className="story-mass-heading"><span>Working group</span><span>{count} included</span></div>
      <div data-story-concentration={strength / 100}>
        <JellyDetails title="Group contents" summary={`${count} of 3 items`} defaultOpen>
          <div className="story-demo-choices" role="group" aria-label="Group contents">
            {['Image', 'Color', 'Notes'].map(label => <JellyButton key={label} size="sm" selected={included.includes(label)} onClick={() => setIncluded(items => items.includes(label) ? items.filter(item => item !== label) : [...items, label])}>
              {included.includes(label) ? <Check size={15} /> : <Minus size={15} />}{label}
            </JellyButton>)}
          </div>
        </JellyDetails>
      </div>
      <JellySlider compact animateTrack={motionEnabled} label="Structure" value={strength} min={30} max={100} formatValue={v => v + '%'} onValueChange={setStrength} />
    </div>
  </figure>;
}

const PAIRS = [
  { name: 'Yellow + blue', from: '#ffd653', to: '#5baff3' },
  { name: 'Rose + blue', from: '#ec93bd', to: '#5baff3' },
  { name: 'Blue + clear', from: '#5baff3', to: '#dcecf4' },
];
const rgbMix = (from, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const ramp = colors => 'linear-gradient(90deg,' + colors.map((color, i) => color + ' ' + i / (colors.length - 1) * 100 + '%').join(',') + ')';
const pigmentStyle = color => ({ '--jb-color': color, '--jb-rgb': [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).join(' ') });

export function ColorExample({ motionEnabled }) {
  const [selected, setSelected] = useState(0), [mix, setMix] = useState(50), [committed, setCommitted] = useState(null);
  const pair = PAIRS[selected];
  const palette = useMemo(() => createJellyPalette(pair.from, pair.to), [pair]);
  const rgbColors = useMemo(() => Array.from({ length: 33 }, (_, i) => rgbMix(pair.from, pair.to, i / 32)), [pair]);
  const draft = { pair: selected, mix };
  const state = colorGroupState(draft, committed);
  const sample = palette.sample(mix / 100);
  const shared = useJellyColor(sample, { disabled: !motionEnabled });
  const first = useJellyColor(state.joined ? sample : pair.from, { disabled: !motionEnabled });
  const second = useJellyColor(state.joined ? sample : pair.to, { disabled: !motionEnabled });
  return <figure className="story-demo" aria-labelledby="color-example-title">
    <figcaption><strong id="color-example-title">Color carries belonging</strong></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Group pigments">
      {PAIRS.map((option, i) => <JellyButton key={option.name} size="sm" selected={selected === i} onClick={() => setSelected(i)}>{option.name}</JellyButton>)}
    </div>
    <div className="color-members" data-joined={state.joined} data-pending={state.joined && state.dirty}>
      <span className="color-material-link" data-gel-surface="fill" data-gel-sampled="true" aria-hidden="true" style={pigmentStyle(shared)} />
      <JellyBadge data-gel-sampled="true" style={pigmentStyle(first)}>Image</JellyBadge>
      <span className="color-members-state" aria-hidden="true">{state.joined ? <LinkSimple size={18} /> : '+'}</span>
      <JellyBadge data-gel-sampled="true" style={pigmentStyle(second)}>Notes</JellyBadge>
    </div>
    <div className="color-comparison">
      {['Spectral.js', 'sRGB'].map((label, i) => <div className="color-comparison-row" key={label}>
        <div className="color-comparison-label"><span>{label}</span><code>{(i === 0 ? sample : rgbMix(pair.from, pair.to, mix / 100)).toUpperCase()}</code></div>
        <div className="color-comparison-ramp" style={{ backgroundImage: ramp(i === 0 ? palette.colors : rgbColors) }}>
          <span className="color-comparison-marker" style={{ left: mix + '%', backgroundColor: i === 0 ? sample : rgbMix(pair.from, pair.to, mix / 100) }} />
        </div>
      </div>)}
    </div>
    <JellySlider compact animateTrack={motionEnabled} label="Shared pigment" value={mix} min={0} max={100} formatValue={v => v + '%'} onValueChange={setMix} />
    <div className="story-color-actions">
      <JellyButton tone="success" size="sm" disabled={!state.dirty} onClick={() => setCommitted({ ...draft })}><Check size={16} />{committed ? 'Update group' : 'Join group'}</JellyButton>
      <JellyButton tone="neutral" size="sm" disabled={!committed} onClick={() => setCommitted(null)}>Separate</JellyButton>
      {committed && state.dirty && <JellyButton tone="neutral" size="sm" onClick={() => { setSelected(committed.pair); setMix(committed.mix); }}>Revert preview</JellyButton>}
      <span role="status" className="story-group-status">{state.label}</span>
    </div>
  </figure>;
}
