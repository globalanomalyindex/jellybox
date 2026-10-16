import { createRef, useState } from 'react';
import { JellyButton, JellySelectionGroup, JellySlider, JellySwitch, JellyDropdown,
  JellyTabs, JellyCheckbox, JellyDialog, JellyTable, JellyWindow, MOTION } from '@jellybox/react';
import { JellyScene, type OpticalScene } from '@jellybox/react/renderer';

// A consumer composition: generic identities, native refs, inputs and optics.
export function Consumer() {
  const [choice, setChoice] = useState(1);
  const [open, setOpen] = useState(false);
  const button = createRef<HTMLButtonElement>();
  const scene: OpticalScene = { width: 300, height: 200, light: { x: 100, y: 20, height: 152, intensity: 1, softness: .45, warmth: .5, enabled: true } };
  const settleDuration: number = MOTION.recoil + MOTION.arrival;
  void scene; void settleDuration;
  return <JellyScene>
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
  </JellyScene>;
}
