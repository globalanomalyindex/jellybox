import { useState } from 'react';

const KEY = 'jellybox.saved-look.v1';
const ranges = { motion: [0, 1], transmission: [0, 1], light: [0, 1], depth: [.65, 1.5], lift: [2, 40], prism: [0, .08], size: [.8, 1.4], spacing: [8, 40] };
const lightRanges = { x: [0, 1], y: [0, 1], intensity: [.2, 1.6], height: [120, 700], softness: [0, 1], warmth: [0, 1] };
const inRanges = (value, limits) => value && Object.entries(limits).every(([key, [min, max]]) => Number.isFinite(value[key]) && value[key] >= min && value[key] <= max);
const valid = look => look && inRanges(look.params, ranges) && inRanges(look.light, lightRanges) && typeof look.light.enabled === 'boolean' && typeof look.paused === 'boolean' && Array.isArray(look.colors) && look.colors.length === 3 && look.colors.every(color => /^#[\da-f]{6}$/i.test(color));
function readSaved() {
  try { const look = JSON.parse(localStorage.getItem(KEY)); return valid(look) ? look : null; } catch { return null; }
}

/** One explicit local keepsake. Ordinary tuning remains transient. */
export function useSavedLook(current, apply) {
  const [saved, setSaved] = useState(readSaved), [deleted, setDeleted] = useState(null);
  const [feedback, setFeedback] = useState({ sequence: 0, status: 'neutral', message: saved ? 'A saved look is ready to restore.' : 'Save the buttons, material and light together.' });
  const report = update => setFeedback(previous => ({ ...update, sequence: (Number.isFinite(previous.sequence) ? previous.sequence : 0) + 1 }));
  const fail = () => report({ status: 'danger', message: 'Browser storage is unavailable. Your current look is still here.' });
  const write = (look, message) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(look));
      setSaved(look); setDeleted(null); report({ status: 'success', message });
    } catch { fail(); }
  };
  return { saved, deleted, ...feedback,
    save: () => write(structuredClone(current), 'Saved on this browser. Restore it whenever you like.'),
    restore: () => { if (saved) { apply(structuredClone(saved)); report({ status: 'neutral', message: 'Saved look restored.' }); } },
    remove: () => {
      if (!saved) return;
      try { localStorage.removeItem(KEY); setDeleted(saved); setSaved(null); report({ status: 'neutral', message: 'Saved look deleted. Your current buttons are unchanged. Undo is available.' }); } catch { fail(); }
    },
    undo: () => { if (deleted) write(deleted, 'Saved look recovered.'); },
  };
}
