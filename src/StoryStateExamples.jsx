import { useEffect, useRef, useState } from 'react';
import { Check } from '@phosphor-icons/react';
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

const TASKS = ['Sketch', 'Review', 'Export'];
const TASK_COPY = ['Gather ideas into a working group.', 'Check the study before sharing it.', 'The finished study is ready to leave the workspace.'];
export function SpotlightExample({ motionEnabled }) {
  const [selected, setSelected] = useState(0), [pointed, setPointed] = useState(null), [focused, setFocused] = useState(null), [enabled, setEnabled] = useState(false), [spread, setSpread] = useState(180);
  const target = pointed ?? focused ?? selected;
  return <figure className="story-demo" aria-labelledby="spotlight-example-title" data-story-spotlight="" data-spotlight={enabled} data-spot-spread={spread}>
    <figcaption><strong id="spotlight-example-title">Light as a guide</strong></figcaption>
    <div className="story-demo-choices" role="group" aria-label="Working step">
      {TASKS.map((task, i) => <JellyButton size="lg" key={task} selected={selected === i} data-spot-target={target === i}
        onPointerEnter={() => setPointed(i)} onPointerLeave={() => setPointed(null)}
        onFocus={() => setFocused(i)} onBlur={() => setFocused(null)} onClick={() => { setSelected(i); setEnabled(true); }}>{selected === i && <Check size={17} />}{task}</JellyButton>)}
    </div>
    <p className="story-task-copy" role="status">{TASK_COPY[selected]}</p>
    <JellySlider compact animateTrack={motionEnabled} label="Light spread" min={120} max={360} value={spread} formatValue={v => v < 200 ? 'Focused' : v < 280 ? 'Balanced' : 'Broad'} onValueChange={setSpread} />
    <JellySwitch label="Task spotlight" checked={enabled} onCheckedChange={setEnabled} />
  </figure>;
}
