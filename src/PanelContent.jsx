import { useEffect, useState } from 'react';
import { JellyDetails } from './JellyDetails.jsx';
import { PalettePreview } from './PalettePreview.jsx';
import { useJellyToneStyle } from '../packages/react/src/useMaterialColor.js';
import { MOVEMENT_PRESETS } from './experiment.js';
import { ArrowCounterClockwise, Check, HandTap, FloppyDisk, Trash, ArrowUUpLeft, CheckCircle, WarningCircle } from '@phosphor-icons/react';
import { JellySelectionGroup, JellyButton, JellySlider } from '../packages/react/src/index.js';

function SaveFeedback({ status, message, sequence }) {
  const style = useJellyToneStyle(status);
  const Icon = status === 'danger' ? WarningCircle : CheckCircle;
  return <p key={sequence} role="status" className="saved-look-status" data-status={status} data-gel-surface={status === 'neutral' ? undefined : 'badge'} data-gel-tone={status} data-gel-sampled="true" data-gel-feedback={status === 'neutral' ? undefined : sequence} style={style}>
    {status !== 'neutral' && <Icon size={17} aria-hidden="true" />}<span>{message}</span>
  </p>;
}

export default function PanelContent({ panel, params, setParams, defaults, reducedMotion, onAnnounce, onReady, colors, setColors, palettes, onNudge, paused, savedLook, preferences, setPreferences }) {
  // Continuous motion governs idle breathing; intentional input still eases.
  const animateTrack = !reducedMotion;
  const colorTarget = preferences.colorTarget;
  const setColorTarget = colorTarget => setPreferences(previous => ({ ...previous, colorTarget }));
  const [previewName, setPreviewName] = useState(null);
  const committedPalette = palettes.find(palette => palette.colors.every((c, i) => c === colors[i]));
  const previewPalette = palettes.find(palette => palette.name === previewName);
  const previewFrom = event => {
    const option = event.target.closest('[data-gel-key]');
    if (option) setPreviewName(option.dataset.gelKey.replace(/^string:/, ''));
  };
  useEffect(() => { onReady?.(); }, [panel]);
  const change = (key, value) => setParams(previous => ({ ...previous, [key]: value }));
  if (panel === 0) return <div className="panel-content explore-content">
    <div className="panel-intro"><h3>Jelly options</h3><p>A slow breath or a proper wobble. Same three buttons.</p></div>
    <JellySelectionGroup className="study-presets" data-gel-bulbs="true" aria-label="Movement presets" value={params.motion} tone="action"
      options={MOVEMENT_PRESETS}
      onValueChange={value => change('motion', value)} />
    <div className="settings-list">
      <JellySlider compact animateTrack={animateTrack} label="Button size" min={80} max={140} value={Math.round(params.size * 100)} formatValue={v => `${v}%`} onValueChange={v => change('size', v / 100)} />
      <JellySlider compact animateTrack={animateTrack} label="Space between" min={8} max={40} value={params.spacing} formatValue={v => `${v}`} onValueChange={v => change('spacing', v)} />
    </div>
    <div className="panel-actions"><JellyButton tone="info" onClick={onNudge} disabled={reducedMotion || paused || params.motion === 0}><HandTap size={18} /> Give them a wobble</JellyButton><span className="panel-note">A nudge, then back to rest.</span></div>
    <section className="saved-look density-well" data-density-region="well" data-open="true" aria-labelledby="saved-look-title">
      <div className="saved-look-heading"><h4 id="saved-look-title">Keep this look.</h4><span className="panel-note">Saved on this browser.</span></div>
      <div className="saved-look-actions">
        <JellyButton tone="success" onClick={savedLook.save}><FloppyDisk size={17} />{savedLook.saved ? 'Update saved look' : 'Save look'}</JellyButton>
        <JellyButton tone="action" disabled={!savedLook.saved} onClick={savedLook.restore}><ArrowCounterClockwise size={17} />Restore</JellyButton>
        {savedLook.deleted ? <JellyButton tone="action" onClick={savedLook.undo}><ArrowUUpLeft size={17} />Undo delete</JellyButton> : <JellyButton tone="danger" disabled={!savedLook.saved} onClick={savedLook.remove}><Trash size={17} />Delete</JellyButton>}
      </div>
      <SaveFeedback status={savedLook.status} message={savedLook.message} sequence={savedLook.sequence} />
    </section>
    {(reducedMotion || paused) && <p className="panel-note">Motion is paused. Size, color, material and light still work.</p>}
  </div>;
  if (panel === 1) return <div className="panel-content color-content">
    <div className="panel-intro"><h3>Candy shop</h3><p>Hover or use arrow keys to try a palette. Click or press Enter to keep it.</p></div>
    <PalettePreview name={previewPalette?.name ?? committedPalette?.name ?? 'Custom'} colors={previewPalette?.colors ?? colors} previewing={!!previewPalette && previewPalette.name !== committedPalette?.name} />
    <JellySelectionGroup className="palette-options" activation="manual" data-gel-bulbs="true" aria-label="Color palettes" tone="action"
      value={committedPalette?.name ?? 'custom'}
      onPointerOver={previewFrom} onPointerLeave={() => setPreviewName(null)} onFocus={previewFrom}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setPreviewName(null); }}
      onKeyDown={e => { if (e.key === 'Escape' && previewName) { e.stopPropagation(); e.preventDefault(); setPreviewName(null); } }}
      options={palettes.map(palette => ({ value: palette.name, label: palette.name, render: <span className="palette-label"><span className="palette-drops" aria-hidden="true">{palette.colors.map((color, i) => <i key={i} style={{ '--drop-color': color }} />)}</span><span>{palette.name}</span></span> }))}
      onValueChange={name => { setColors([...palettes.find(palette => palette.name === name).colors]); setPreviewName(null); onAnnounce(`${name} palette selected.`); }} />
    <div className="individual-color"><JellySelectionGroup data-gel-bulbs="true" aria-label="Button to color" value={colorTarget} tone="action" options={['Explore', 'Color', 'Material'].map((label, value) => ({ label, value }))} onValueChange={setColorTarget} />
      <label className="color-mixer"><span>Selected pigment</span><input aria-label={`${['Explore', 'Color', 'Material'][colorTarget]} button color`} type="color" value={colors[colorTarget]} onInput={e => { const value = e.currentTarget.value; setColors(previous => previous.map((color, i) => i === colorTarget ? value : color)); }} /><span className="color-value">{colors[colorTarget].toUpperCase()}</span></label>
    </div>
    <p className="panel-note">Previewing doesn’t change your saved or selected colors. The check always marks your choice.</p>
  </div>;
  return <div className="panel-content material-content">
    <div className="panel-intro"><h3>Find your kind of jelly.</h3><p>Thicker, clearer, floatier. The edges tell the story.</p></div>
    <div className="settings-list">{[
      ['transmission', 'Translucency', 0, 100, 100, '%'], ['light', 'Surface light', 0, 100, 100, '%'],
    ].map(([key, label, min, max, scale, unit]) => <JellySlider compact animateTrack={animateTrack} key={key} tone="action" label={label} min={min} max={max} value={Math.round(params[key] * scale)} formatValue={value => `${value}${unit}`} onValueChange={value => change(key, value / scale)} />)}</div>
    <JellyDetails open={preferences.shapeOpen} onOpenChange={shapeOpen => setPreferences(previous => ({ ...previous, shapeOpen }))} title="Shape & optics" summary={`${Math.round(params.depth * 100)}% thick · ${params.lift} lift · ${Math.round(params.prism * 1250)}% prism`}>
      <div className="settings-list">{[
        ['depth', 'Thickness', 65, 150, 100, '%'], ['lift', 'Lift', 2, 40, 1, ''], ['prism', 'Prism', 0, 100, 1250, '%'],
      ].map(([key, label, min, max, scale, unit]) => <JellySlider compact animateTrack={animateTrack && preferences.shapeOpen} key={key} tone="action" label={label} min={min} max={max} value={Math.round(params[key] * scale)} formatValue={value => `${value}${unit}`} onValueChange={value => change(key, value / scale)} />)}</div>
    </JellyDetails>
    <p className="panel-note">Drag a value bubble for quick adjustment. Hold Shift to go finer.</p>
    <div className="panel-actions"><JellyButton size="sm" tone="info" onClick={() => { setParams(previous => ({ ...previous, ...Object.fromEntries(['transmission', 'light', 'depth', 'lift', 'prism'].map(key => [key, defaults[key]])) })); onAnnounce('Material reset.'); }}><ArrowCounterClockwise size={16} /> Reset material</JellyButton><span className="panel-note">6% translucency · 25% surface light</span></div>
  </div>;
}
