import React, { useEffect, useMemo, useRef } from 'react';
import { MOTION, sampleBezier } from '../packages/react/src/renderer/motion.js';
import { motionLoopFrames } from './story-examples.js';
import { useStoryPlayback } from './useStoryPlayback.js';
import './story-motion.css';

const PERIOD = 2520;
const RESPONSES = [
  { name: 'Open', duration: MOTION.windowOpen, curve: MOTION.gather },
  { name: 'Close', duration: MOTION.windowClose, curve: MOTION.withdraw },
  { name: 'Slider', duration: MOTION.sliderTravel, curve: MOTION.sliderTravelCurve },
  { name: 'Recoil', duration: MOTION.recoil, curve: MOTION.recoilCurve },
];

function curveTrace(curve) {
  const points = Array.from({ length: 81 }, (_, i) => [i / 80 * 256, 120 - sampleBezier(curve, i / 80) * 96]);
  const lengths = [0];
  points.slice(1).forEach(([x, y], i) => lengths.push(lengths[i] + Math.hypot(x - points[i][0], y - points[i][1])));
  return {
    path: points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`).join(' '),
    progress(time) {
      const at = Math.max(0, Math.min(80, time * 80)), i = Math.min(79, Math.floor(at));
      return (lengths[i] + (lengths[i + 1] - lengths[i]) * (at - i)) / lengths[80];
    },
  };
}

function MotionTrace({ response, trace }) {
  return <section className="story-motion-cell" data-motion-response={response.name} aria-label={response.name + ' motion response'}>
    <div className="story-motion-heading"><h4>{response.name}</h4><span>{response.duration} ms</span></div>
    <code>{response.curve}</code>
    <div className="story-motion-graph">
      <div className="story-motion-y-labels" aria-hidden="true"><span>100%</span><span>0</span></div>
      <svg className="story-motion-chart" viewBox="0 0 256 132" preserveAspectRatio="none" role="img" aria-label={`${response.name} response, ${response.duration} milliseconds${response.name === 'Recoil' ? ', with spatial overshoot' : ''}`}>
        <path className="chart-guide" d="M0 0V120H256 M0 24H256" />
        <path className="chart-response" d={trace.path} />
        <path className="chart-progress" d={trace.path} pathLength="1" />
        <path className="chart-playhead" d="M0 0V120" />
        <circle className="chart-dot" cx="0" cy="120" r="4" />
      </svg>
      <div className="story-motion-x-labels" aria-hidden="true"><span>0 ms</span><span>{response.duration} ms</span></div>
    </div>
    <div className="story-motion-travel" aria-hidden="true" inert>
      <span className="story-motion-rail" />
      <span className="chart-material-carrier"><span className="chart-jelly" data-gel-surface="thumb" data-gel-sampled="true" data-gel-motion-preview="" data-gel-assist="false" /></span>
    </div>
  </section>;
}

export function MotionExample({ motionEnabled }) {
  const ref = useRef(null);
  const playback = useStoryPlayback(ref, { enabled: motionEnabled });
  const traces = useMemo(() => RESPONSES.map(response => curveTrace(response.curve)), []);
  const { running, getElapsed } = playback;
  useEffect(() => {
    if (!running || typeof Element.prototype.animate !== 'function') return;
    // Every cell keeps its real response speed. A shared period and origin keep
    // graph, marker and optical jelly synchronized across repeated cycles.
    const start = document.timeline.currentTime - getElapsed();
    const animations = RESPONSES.flatMap((response, index) => {
      const cell = ref.current.querySelector(`[data-motion-response="${response.name}"]`);
      const { frames, duration } = motionLoopFrames(response, PERIOD);
      const tracks = [
        ['.chart-playhead', frame => ({ transform: `translateX(${frame.time * 256}px)` })],
        ['.chart-dot', frame => ({ transform: `translate(${frame.time * 256}px, ${-frame.value * 96}px)` })],
        ['.chart-progress', frame => ({ strokeDashoffset: 1 - traces[index].progress(frame.time) })],
        ['.chart-material-carrier', frame => ({ transform: `translateX(${frame.value * 100}%)` })],
        ['.chart-jelly', frame => ({ transform: `scale(${1 + frame.strain}, ${1 - frame.strain})` })],
      ];
      return tracks.map(([selector, properties]) => {
        const animation = cell.querySelector(selector).animate(frames.map(frame => ({ offset: frame.offset, ...properties(frame) })), { duration, iterations: Infinity, easing: 'linear' });
        animation.startTime = start;
        return animation;
      });
    });
    return () => animations.forEach(animation => animation.cancel());
  }, [running, getElapsed, traces]);

  return <figure ref={ref} className="story-demo story-motion" aria-labelledby="motion-example-title" data-motion-loop={running ? 'running' : 'paused'}>
    <figcaption><strong id="motion-example-title">A curve has a job</strong></figcaption>
    <div className="story-motion-grid">
      {RESPONSES.map((response, i) => <MotionTrace key={response.name} response={response} trace={traces[i]} />)}
    </div>
  </figure>;
}
