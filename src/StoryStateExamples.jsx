import { useEffect, useRef, useState } from 'react';
import { Lightbulb } from '@phosphor-icons/react';
import { JellyActivityButton, JellyBadge, JellyButton, JellySlider, JellySwitch } from '../packages/react/src/index.js';
import { useJellyToneStyle } from '../packages/react/src/useMaterialColor.js';
import { taskSample } from './story-examples.js';
import { MOTION } from '../packages/react/src/renderer/motion.js';

const OUTCOMES = [{ value: 'success', name: 'Success', tone: 'success' }, { value: 'warning', name: 'Warning', tone: 'warning' }, { value: 'error', name: 'Failure', tone: 'danger' }];
const MESSAGES = { idle: 'Ready', loading: 'Generating a study', success: 'Study ready', warning: 'Needs your review', error: 'Generation interrupted' };

export function LoadingExample() {
  const [status, setStatus] = useState('idle'), [outcome, setOutcome] = useState('success'), [progress, setProgress] = useState(0), [determinate, setDeterminate] = useState(true);
  const timer = useRef(null);
  const busy = status === 'loading';
  const material = useJellyToneStyle(status === 'success' ? 'success' : status === 'error' ? 'danger' : status === 'warning' ? 'warning' : 'info');
  useEffect(() => () => clearTimeout(timer.current), []);
  const cancel = () => { clearTimeout(timer.current); setStatus('idle'); setProgress(0); };
  const start = () => {
    clearTimeout(timer.current);
    const began = performance.now();
    setStatus('loading'); setProgress(0);
    const tick = () => {
      // One full breath for this labeled demonstration. Real hosts own their
      // task duration; JellyActivityButton never delays application completion.
      const next = taskSample(performance.now() - began, outcome, MOTION.breathe);
      setProgress(next.progress); setStatus(next.status);
      if (next.status === 'loading') timer.current = setTimeout(tick, 80);
    };
    timer.current = setTimeout(tick, 80);
  };
  return <figure className="story-demo" aria-labelledby="loading-example-title">
    <figcaption><strong id="loading-example-title">A state moves through the material</strong><small>Simulated generation</small></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Generation outcome">
      {OUTCOMES.map(option => <JellyButton size="sm" key={option.value} tone={option.tone} selected={outcome === option.value} disabled={busy} onClick={() => { setOutcome(option.value); setStatus('idle'); setProgress(0); }}>{option.name}</JellyButton>)}
    </div>
    <div className="story-task-action"><JellyActivityButton status={status} progress={determinate && busy ? progress : undefined} onClick={start} />
      {busy && <JellyButton size="sm" tone="neutral" onClick={cancel}>Cancel</JellyButton>}
      <JellyBadge tone={status === 'success' ? 'success' : status === 'error' ? 'danger' : status === 'warning' ? 'warning' : 'neutral'} role="status">{MESSAGES[status]}</JellyBadge>
    </div>
    <div className="story-progress" role="progressbar" aria-label="Generation progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={determinate ? progress : undefined} style={material}>
      <span data-gel-surface="track" data-gel-sampled="true" data-gel-activity={!determinate && busy ? 'loading' : undefined} />
      {determinate && <span className="story-progress-fill" data-gel-surface="fill" data-gel-sampled="true" style={{ transform: `scaleX(${progress / 100})` }} />}
    </div>
    <JellySwitch label="Show progress" checked={determinate} onCheckedChange={setDeterminate} />
  </figure>;
}

const LAMP_POSITIONS = ['Left', 'Center', 'Right'];
export function DesktopLampExample({ motionEnabled }) {
  const [position, setPosition] = useState(1), [enabled, setEnabled] = useState(false), [height, setHeight] = useState(180), [brightness, setBrightness] = useState(100);
  return <figure className="story-demo" aria-labelledby="desktop-lamp-title" data-desktop-lamp={enabled} data-lamp-height={height} data-lamp-brightness={brightness}>
    <figcaption><strong id="desktop-lamp-title">A light on your desktop</strong></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Lamp position">
      {LAMP_POSITIONS.map((name, i) => <JellyButton size="lg" key={name} selected={position === i} data-lamp-anchor={position === i}
        onClick={() => { setPosition(i); setEnabled(true); }}><Lightbulb size={17} weight={position === i ? 'fill' : 'regular'} />{name}</JellyButton>)}
    </div>
    <JellySlider compact animateTrack={motionEnabled} label="Lamp height" min={120} max={360} value={height} formatValue={v => `${v}`} onValueChange={setHeight} />
    <JellySlider compact animateTrack={motionEnabled} label="Lamp brightness" min={20} max={140} value={brightness} formatValue={v => `${v}%`} onValueChange={setBrightness} />
    <JellySwitch label="Desktop lamp" checked={enabled} onCheckedChange={setEnabled} />
  </figure>;
}
