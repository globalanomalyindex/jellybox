import { createRef, useState } from 'react';
import { JellyButton, JellySelectionGroup, JellySlider, JellySwitch, JellyDropdown,
  JellyTabs, JellyCheckbox, JellyDialog, JellyTable, JellyWindow, JellyActivityButton, JellyMaterialProvider, chooseJellyInk, MOTION } from '@jellybox/react';
import { JellyScene, type OpticalScene } from '@jellybox/react/renderer';

// A consumer composition: generic identities, native refs, inputs and optics.
export function Consumer() {
  const [choice, setChoice] = useState(1);
  const [open, setOpen] = useState(false);
  const button = createRef<HTMLButtonElement>();
  const scene: OpticalScene = { width: 300, height: 200,
    panel: { x: 0, y: 0, width: 300, height: 200,
      density: { x: 20, y: 20, width: 260, height: 140, pigment: '#6bbbf0', opacity: 1, folder: true, hover: true, childActive: open,
        transferTarget: open ? { id: 'density-value', x: 200, y: 100, width: 58, height: 44 } : null } },
    bubbles: [{ id: 'density-value', x: 200, y: 100, width: 58, height: 44 }],
    contrastTargets: [{ id: 'action', x: 20, y: 20, width: 80, height: 16, ink: '#000000' }],
    light: { x: 100, y: 20, height: 152, intensity: 1, softness: .45, warmth: .5, enabled: true } };
  const settleDuration: number = MOTION.recoil + MOTION.arrival;
  const ink: string = chooseJellyInk(['#085bb9'], undefined, { preferred: '#000000' }).ink;
  void ink;
  void scene; void settleDuration;
  return <JellyMaterialProvider pigment="#ffb251"><JellyScene>
    <JellyActivityButton status="loading" progress={42} />
    <JellyWindow viewKey={choice}>{visible => <span>{visible}</span>}</JellyWindow>
    <JellySelectionGroup aria-label="Choice" value={choice} onValueChange={setChoice} options={[{ value: 1, label: 'One' }, { value: 2, label: 'Two' }]} />
    <JellySlider label="Density" defaultValue={50} animateTrack onValueChange={value => value.toFixed(0)} />
    <JellySwitch label="Motion" defaultChecked onCheckedChange={value => value.valueOf()} />
    <JellyDropdown label="Variant" value={choice} onValueChange={setChoice} options={[{ value: 1, label: 'One' }]} />
    <JellyTabs value={choice} onValueChange={setChoice} items={[{ value: 1, label: 'One', content: 'Content' }]} />
    <JellyCheckbox label="Include" defaultChecked />
    <JellyButton ref={button} onClick={() => setOpen(true)}>Open</JellyButton>
    <JellyDialog open={open} onOpenChange={setOpen} title="Details"><JellyButton onClick={() => setOpen(false)}>Done</JellyButton></JellyDialog>
    <JellyTable caption="Choices" rows={[{ id: 1, name: 'One' }]} columns={[{ key: 'name', header: 'Name', render: (_value, row) => row.name }]} />
  </JellyScene></JellyMaterialProvider>;
}
