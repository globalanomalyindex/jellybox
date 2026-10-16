import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { JellyButton, JellySlider } from '../packages/react/src/index.js';
import { createJellyPalette } from '../packages/react/src/color.js';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';

// One short demonstration on entry, then direct inspection. No offscreen loop.
function useDemoClock(ref, duration, enabled) {
  const [time, setTime] = useState(1);
  const frame = useRef(null), seen = useRef(false);
  const stop = useCallback(() => { cancelAnimationFrame(frame.current); frame.current = null; }, []);
  const replay = useCallback(() => {
    stop();
    seen.current = true;
    if (!enabled) { setTime(1); return; }
    const start = performance.now();
    setTime(0);
    const tick = now => {
      const next = Math.min(1, (now - start) / duration);
      setTime(next);
      frame.current = next < 1 ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
  }, [duration, enabled, stop]);
  const scrub = value => { seen.current = true; stop(); setTime(value); };
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) stop();
      else if (!seen.current && enabled) { seen.current = true; replay(); }
    }, { threshold: .35 });
    observer.observe(ref.current);
    return () => { observer.disconnect(); stop(); };
  }, [enabled, ref, replay, stop]);
  useEffect(() => {
    const hide = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [stop]);
  return { time, scrub, replay };
}

const RESPONSES = [
  { name: 'Open', duration: MOTION.windowOpen, curve: MOTION.gather, note: 'A larger mass gathers deliberately, then settles into place.' },
  { name: 'Close', duration: MOTION.windowClose, curve: MOTION.withdraw, note: 'The window gathers back without making the return feel abrupt.' },
  { name: 'Slider', duration: MOTION.sliderTravel, curve: MOTION.sliderTravelCurve, note: 'A track click travels to the accepted value. Dragging and keys stay direct.' },
  { name: 'Recoil', duration: MOTION.recoil, curve: MOTION.recoilCurve, note: 'A small overshoot belongs to the material, never a value or click target.' },
];

function MotionTrace({ response, motionEnabled }) {
  const ref = useRef(null);
  const { time, scrub, replay } = useDemoClock(ref, response.duration, motionEnabled);
  const value = sampleBezier(response.curve, time);
  const path = useMemo(() => Array.from({ length: 81 }, (_, i) => {
    const t = i / 80;
    return (i ? 'L' : 'M') + (40 + t * 480).toFixed(2) + ',' + (140 - sampleBezier(response.curve, t) * 96).toFixed(2);
  }).join(' '), [response.curve]);
  return <div ref={ref}>
    <div className="story-demo-readout"><span>{response.duration} ms</span><code>{response.curve}</code></div>
    <svg className="motion-chart" viewBox="0 0 560 204" role="img" aria-label={response.name + ' response over ' + response.duration + ' milliseconds. ' + response.note}>
      <path className="chart-guide" d="M40 20V140H520 M40 44H520" />
      <text x="30" y="48" textAnchor="end">100%</text><text x="30" y="144" textAnchor="end">0</text>
      <text x="40" y="162">0 ms</text><text x="520" y="162" textAnchor="end">{response.duration} ms</text>
      <path className="chart-response" d={path} />
      <path className="chart-playhead" d={'M' + (40 + time * 480) + ' 20V140'} />
      <circle className="chart-dot" cx={40 + time * 480} cy={140 - value * 96} r="5" />
      <path className="chart-rail" d="M40 188H520" />
      <rect className="chart-material" x={40 + value * 410} y="179" width="40" height="18" rx="9" />
    </svg>
    <div className="story-demo-controls">
      <JellySlider animateTrack={motionEnabled} label="Elapsed time" value={Math.round(time * response.duration)} min={0} max={response.duration} formatValue={v => v + ' ms'} onValueChange={v => scrub(v / response.duration)} />
      <JellyButton size="sm" tone="neutral" onClick={replay} disabled={!motionEnabled}>Replay motion</JellyButton>
    </div>
    <p className="story-demo-note">{response.note}{!motionEnabled && ' Motion is paused; drag the time control to inspect the curve.'}</p>
  </div>;
}

export function MotionExample({ motionEnabled }) {
  const [selected, setSelected] = useState(0);
  return <figure className="story-demo" aria-labelledby="motion-example-title">
    <figcaption><strong id="motion-example-title">A curve has a job</strong><span>These are the timings the interface actually uses. Pick a response, replay it, or inspect a moment.</span></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Motion response">
      {RESPONSES.map((response, i) => <JellyButton key={response.name} size="sm" tone="action" selected={selected === i} onClick={() => setSelected(i)}>{response.name}</JellyButton>)}
    </div>
    <MotionTrace key={selected} response={RESPONSES[selected]} motionEnabled={motionEnabled} />
  </figure>;
}

const PAIRS = [
  { name: 'Yellow + blue', from: '#ffd653', to: '#136aee' },
  { name: 'Rose + blue', from: '#dd3c88', to: '#5baff3' },
  { name: 'Blue + clear', from: '#136aee', to: '#dcecf4' },
];
const rgbMix = (from, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const ramp = colors => 'linear-gradient(90deg,' + colors.map((color, i) => color + ' ' + i / (colors.length - 1) * 100 + '%').join(',') + ')';

export function ColorExample({ motionEnabled }) {
  const ref = useRef(null);
  const [selected, setSelected] = useState(0), [manual, setManual] = useState(null);
  const { time, scrub, replay } = useDemoClock(ref, MOTION.pigment, motionEnabled);
  const pair = PAIRS[selected];
  const palette = useMemo(() => createJellyPalette(pair.from, pair.to), [pair]);
  const rgbColors = useMemo(() => Array.from({ length: 33 }, (_, i) => rgbMix(pair.from, pair.to, i / 32)), [pair]);
  const mix = manual ?? .5 * sampleBezier(MOTION.pigmentCurve, time);
  const colors = [palette.sample(mix), rgbMix(pair.from, pair.to, mix)];
  const play = () => { setManual(null); replay(); };
  return <figure ref={ref} className="story-demo" aria-labelledby="color-example-title">
    <figcaption><strong id="color-example-title">What happens between two colors</strong><span>The same endpoints, through two different mixing paths. Move through the middle to see the difference.</span></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Mixing colors">
      {PAIRS.map((option, i) => <JellyButton key={option.name} size="sm" tone="action" selected={selected === i} onClick={() => { setSelected(i); setManual(null); replay(); }}>{option.name}</JellyButton>)}
    </div>
    <div className="color-comparison">
      {['Spectral.js', 'sRGB interpolation'].map((label, i) => <div className="color-comparison-row" key={label}>
        <div className="color-comparison-label"><span>{label}</span><code>{colors[i].toUpperCase()}</code></div>
        <div className="color-comparison-ramp" style={{ backgroundImage: ramp(i === 0 ? palette.colors : rgbColors) }}>
          <span className="color-comparison-marker" style={{ left: mix * 100 + '%', backgroundColor: colors[i] }} />
        </div>
      </div>)}
    </div>
    <div className="story-demo-controls">
      <JellySlider animateTrack={motionEnabled} label="Mix toward the second color" value={Math.round(mix * 100)} min={0} max={100} formatValue={v => v + '%'} onValueChange={v => { scrub(time); setManual(v / 100); }} />
      <JellyButton size="sm" tone="neutral" onClick={play} disabled={!motionEnabled}>Replay mix</JellyButton>
    </div>
    <p className="story-demo-note">33 cached pigment samples, a shared {MOTION.pigment} ms transition. This is a color-path comparison, not a simulation of light passing through jelly.</p>
  </figure>;
}
