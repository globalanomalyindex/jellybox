import { JellySkeleton } from '../packages/react/src/index.js';

export function PanelSkeleton({ panel }) {
  return <div className={`panel-skeleton skeleton-${panel}`}><JellySkeleton lines={4} label="Loading panel" /></div>;
}
