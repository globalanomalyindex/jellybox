import { createContext, createElement, useContext } from 'react';
import { normalizeJellyColor } from './color.js';

const MaterialPigment = createContext(undefined);

/** Share a window's accent target; existing control hooks own its pigment travel. */
export function JellyMaterialProvider({ pigment, children }) {
  return createElement(MaterialPigment.Provider, { value: pigment == null ? undefined : normalizeJellyColor(pigment) }, children);
}

export function useMaterialPigment(tone, explicit) {
  const inherited = useContext(MaterialPigment);
  return explicit ?? (['action', 'info', 'neutral'].includes(tone) ? inherited : undefined);
}
