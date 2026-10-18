import { useRef } from 'react';
import { Lightbulb } from '@phosphor-icons/react';
import { JellyActivityButton, JellyButton } from '../packages/react/src/index.js';
import { activityDemoSample, lampDemoSample } from './story-playback.js';
import { useStoryPlayback } from './useStoryPlayback.js';

const OUTCOMES = [
  { value: 'success', name: 'Success' },
  { value: 'warning', name: 'Warning' },
  { value: 'error', name: 'Failure' },
];

export function LoadingExample({ motionEnabled }) {
  const ref = useRef(null);
  const playback = useStoryPlayback(ref, { enabled: motionEnabled, sample: activityDemoSample });
  const stage = playback.value.status;
  return <figure ref={ref} className="story-demo" aria-labelledby="loading-example-title" data-story-playback={playback.running ? 'running' : 'paused'}>
    <figcaption><strong id="loading-example-title">A state moves through the material</strong><small>Simulated states</small></figcaption>
    <div className="story-feedback-grid">
      <div className="story-feedback-lane">
        <span className="story-feedback-label">Indeterminate loading</span>
        <div className="story-demo-passive" inert aria-hidden="true">
          <JellyActivityButton status="loading" tabIndex={-1} data-gel-assist="false">Loading</JellyActivityButton>
        </div>
      </div>
      {OUTCOMES.map(outcome => <div key={outcome.value} className="story-feedback-lane">
        <span className="story-feedback-label">{outcome.name}</span>
        <div className="story-demo-passive" inert aria-hidden="true">
          <JellyActivityButton status={stage === 'result' ? outcome.value : 'loading'} tabIndex={-1} data-gel-assist="false">
            {stage === 'result' ? outcome.name : 'Loading'}
          </JellyActivityButton>
        </div>
      </div>)}
    </div>
  </figure>;
}

const LAMP_POSITIONS = ['Left', 'Center', 'Right'];
export function DesktopLampExample({ motionEnabled }) {
  const ref = useRef(null);
  const playback = useStoryPlayback(ref, { enabled: motionEnabled, sample: lampDemoSample });
  const { position, height, brightness } = playback.value;
  return <figure ref={ref} className="story-demo story-lamp-demo" aria-labelledby="desktop-lamp-title"
    data-story-playback={playback.running ? 'running' : 'paused'} data-desktop-lamp={playback.running || playback.staticMode}
    data-lamp-height={height} data-lamp-brightness={brightness}>
    <figcaption><strong id="desktop-lamp-title">A light on your desktop</strong></figcaption>
    <div className="story-demo-passive story-demo-choices" inert aria-hidden="true">
      {LAMP_POSITIONS.map((name, i) => <JellyButton size="lg" key={name} selected={position === i} data-lamp-anchor={position === i} tabIndex={-1} data-gel-assist="false">
        <Lightbulb size={17} weight={position === i ? 'fill' : 'regular'} />{name}
      </JellyButton>)}
    </div>
    <output className="story-lamp-position" aria-live="off">Light position: {LAMP_POSITIONS[position].toLowerCase()}</output>
  </figure>;
}
