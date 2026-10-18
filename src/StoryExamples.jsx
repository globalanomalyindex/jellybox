import { useMemo, useRef, useState } from 'react';
import { Check, LinkSimple, Minus } from '@phosphor-icons/react';
import { JellyBadge, JellyButton } from '../packages/react/src/index.js';
import { createJellyPalette } from '../packages/react/src/color.js';
import { useJellyColor } from '../packages/react/src/useMaterialColor.js';
import { JellyDetails } from './JellyDetails.jsx';
import { useStoryPlayback } from './useStoryPlayback.js';
import { colorStorySample } from './story-examples.js';
export { MotionExample } from './StoryMotionExamples.jsx';

function DensityGroup({ gathered }) {
  const [included, setIncluded] = useState(['Image', 'Color']);
  const label = gathered ? 'Gathered structure' : 'Open film';
  const summary = `${included.length} of 3 included`;
  const choices = <div className="story-demo-choices" role="group" aria-label={`${label} group contents`}>
    {['Image', 'Color', 'Notes'].map(item => <JellyButton key={item} size="sm" selected={included.includes(item)}
      onClick={() => setIncluded(items => items.includes(item) ? items.filter(value => value !== item) : [...items, item])}>
      {included.includes(item) ? <Check size={15} /> : <Minus size={15} />}{item}
    </JellyButton>)}
  </div>;
  return <section className="story-density-example" aria-label={label}>
    <h4>{label}</h4>
    {gathered ? <div data-story-concentration="1">
      <JellyDetails title="Group contents" summary={summary} defaultOpen>{choices}</JellyDetails>
    </div> : <div className="story-open-film">
      <div className="story-open-film-title">Group contents</div>
      <small className="jelly-details-summary">{summary}</small>
      <div className="story-open-film-content">{choices}</div>
    </div>}
  </section>;
}

export function DensityExample() {
  return <figure className="story-demo" aria-labelledby="density-example-title">
    <figcaption><strong id="density-example-title">Structure from the same material</strong></figcaption>
    <div className="story-mass" data-story-mass="" data-mass-pigment="#91d2f5">
      <div className="story-density-grid">
        <DensityGroup gathered={false} />
        <DensityGroup gathered />
      </div>
    </div>
  </figure>;
}

const PAIR = { from: '#ffd653', to: '#5baff3' };
const rgbMix = (from, to, t) => '#' + [1, 3, 5].map(i => Math.round(parseInt(from.slice(i, i + 2), 16) * (1 - t) + parseInt(to.slice(i, i + 2), 16) * t).toString(16).padStart(2, '0')).join('');
const ramp = colors => 'linear-gradient(90deg,' + colors.map((color, i) => color + ' ' + i / (colors.length - 1) * 100 + '%').join(',') + ')';
const pigmentStyle = color => ({ '--jb-color': color, '--jb-rgb': [1, 3, 5].map(i => parseInt(color.slice(i, i + 2), 16)).join(' ') });

export function ColorExample({ motionEnabled }) {
  const ref = useRef(null);
  const { value: state, running } = useStoryPlayback(ref, { enabled: motionEnabled, sample: colorStorySample });
  const { mix } = state;
  const palette = useMemo(() => createJellyPalette(PAIR.from, PAIR.to), []);
  const rgbColors = useMemo(() => Array.from({ length: 33 }, (_, i) => rgbMix(PAIR.from, PAIR.to, i / 32)), []);
  const sample = palette.sample(mix / 100);
  const shared = useJellyColor(sample, { disabled: !running });
  const first = useJellyColor(state.joined ? sample : PAIR.from, { disabled: !running });
  const second = useJellyColor(state.joined ? sample : PAIR.to, { disabled: !running });
  return <figure ref={ref} className="story-demo" aria-labelledby="color-example-title" data-story-playback={running ? 'running' : 'paused'}>
    <figcaption><strong id="color-example-title">Color carries belonging</strong></figcaption>
    <div className="story-color-readout"><span>Yellow + blue</span><output aria-live="off">{state.label}</output></div>
    <div className="color-members" data-joined={state.joined} data-pending={state.pending}>
      <span className="color-material-link" data-gel-surface="fill" data-gel-sampled="true" aria-hidden="true" style={pigmentStyle(shared)} />
      <JellyBadge data-gel-sampled="true" style={pigmentStyle(first)}>Image</JellyBadge>
      <span className="color-members-state" aria-hidden="true">{state.joined ? <LinkSimple size={18} /> : '+'}</span>
      <JellyBadge data-gel-sampled="true" style={pigmentStyle(second)}>Notes</JellyBadge>
    </div>
    <div className="color-comparison">
      {['Spectral.js', 'sRGB'].map((label, i) => <div className="color-comparison-row" key={label}>
        <div className="color-comparison-label"><span>{label}</span><code>{(i === 0 ? shared : rgbMix(PAIR.from, PAIR.to, mix / 100)).toUpperCase()}</code></div>
        <div className="color-comparison-ramp" style={{ backgroundImage: ramp(i === 0 ? palette.colors : rgbColors) }}>
          <span className="color-comparison-position" style={{ transform: `translateX(${mix}%)` }}><span className="color-comparison-marker" style={{ backgroundColor: i === 0 ? shared : rgbMix(PAIR.from, PAIR.to, mix / 100) }} /></span>
        </div>
      </div>)}
    </div>
  </figure>;
}
