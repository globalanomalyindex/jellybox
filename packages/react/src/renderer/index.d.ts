import * as React from 'react';
import type { JellySceneProps, MaterialParams } from '../index.js';

/** Browser-only optical adapter. Core components remain usable without Three. */
export function JellyScene(props: JellySceneProps): React.ReactElement;
export interface OpticalRect { x: number; y: number; width: number; height: number; cornerRadius?: number; }
export interface OpticalBody extends OpticalRect {
  id?: string; kind?: 'control' | 'badge' | 'table' | 'row' | 'menu' | 'option' | 'alert' | 'track' | 'thumb' | 'fill'; layer?: number; attached?: boolean; contact?: boolean; clip?: OpticalRect;
  color?: readonly [number, number, number]; opacity?: number; hover?: number; pressed?: number; selected?: boolean; grouped?: boolean; stir?: number; windowDepth?: number; arrival?: number;
  density?: OpticalDensity | null;
  activity?: 'idle' | 'loading' | 'success' | 'warning' | 'error'; progress?: number;
  /** Already-eased shared pigment phase, 0–1. Omit for a local 480 ms response. */
  activityPhase?: number;
  /** Opaque destination pigment; the current joins it on activityPhase. */
  activityColor?: string;
}
export interface OpticalDensity extends OpticalRect {
  pigment: string; opacity: number; concentration?: number; folder?: boolean; expandedHeight?: number; phase?: number; open?: boolean; hover?: boolean;
  /** An active child keeps a faint parent connection while owning motion. */
  childActive?: boolean;
  /** Folder receiver: a registered surface ID and its bounds in scene coordinates. Omit or pass null to return density. */
  transferTarget?: (OpticalRect & { id: string }) | null;
}
export interface OpticalSelection extends OpticalBody { id: string; key: string; }
/** Position in scene pixels; height uses the renderer's authored scene units. */
export interface OpticalLight { x: number; y: number; height: number; intensity: number; softness: number; warmth: number; enabled?: boolean; }
export interface OpticalReadingTarget extends OpticalRect {
  id: string;
  /** Stable reading intent, independent of sampled lighting. Defaults to black. */
  ink?: '#000000' | '#ffffff';
  reactive?: boolean;
  /** @deprecated Ignored; lettering has no outline. */
  guard?: boolean;
}
export interface OpticalScene {
  width: number; height: number; dpr?: number; reducedMotion?: boolean; params?: Partial<MaterialParams>;
  viewportTop?: number; viewportHeight?: number; documentTop?: number; light?: OpticalLight | null;
  lightAnchor?: { x: number; y: number };
  contrastTargets?: readonly OpticalReadingTarget[];
  scrollEdge?: { height: number; strength: number } | null;
  panel?: OpticalBody | null; buttons?: readonly (OpticalBody | null)[]; bubbles?: readonly OpticalBody[]; selections?: readonly OpticalSelection[];
  parallax?: { x?: number; y?: number }; pointer?: { x?: number; y?: number; visible?: boolean };
}
export interface OpticsController { renderOnce(timestamp?: number): void; destroy(): void; }
export interface OpticalInk { id: string; ink: string; ratio: number; /** @deprecated Lettering has no outline; always false. */ halo: boolean; }
export function createOptics(canvas: HTMLCanvasElement, options: { getScene: () => OpticalScene | null; onError?: (message: string) => void; onAfterRender?: () => void; onContrast?: (readings: readonly OpticalInk[]) => void }): OpticsController;
