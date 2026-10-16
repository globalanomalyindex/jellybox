import { Drop, SlidersHorizontal, SquaresFour } from '@phosphor-icons/react';
import { useJellyColor } from '../packages/react/src/useMaterialColor.js';
const labels = ['Explore', 'Color', 'Material'];
const icons = [SquaresFour, Drop, SlidersHorizontal];
function Pigment({ color, index }) {
  const displayed = useJellyColor(color);
  const Icon = icons[index];
  return <div className="pigment-sample">
    <span className="pigment-volume" data-gel-surface="" data-gel-sampled="true" style={{ '--jb-color': displayed, '--jb-rgb': [1,3,5].map(at => parseInt(displayed.slice(at,at+2),16)).join(' ') }} aria-hidden="true"><Icon size={23} /></span>
    <span>{labels[index]}</span>
  </div>;
}
export function PalettePreview({ name, colors, previewing }) {
  return <section className="palette-preview" aria-label={`${name} palette preview`}>
    <div className="palette-preview-heading"><h4>{name}</h4><span>{previewing ? 'Preview · Enter or click to keep it' : 'Your current palette'}</span></div>
    <div className="pigment-samples">{colors.map((color,index) => <Pigment key={index} color={color} index={index} />)}</div>
  </section>;
}
