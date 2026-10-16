import { MOTION, sampleBezier } from './motion.js';

export function primaryTabMerge(button, panel) {
  if (Number.isFinite(button.merge)) return Math.max(0, Math.min(1, button.merge));
  // A completed tab belongs to its window. Proximity is not ownership:
  // responsive/late layout changes must never leave a second pill over its label.
  return button.tabbed && panel?.tab?.engaged ? 1 : 0;
}
const clamp = t => Math.max(0, Math.min(1, t));
const ease = (start, end, t, curve = MOTION.squeeze) => sampleBezier(curve, clamp((t - start) / (end - start)));
const mix = (a, b, t) => a + (b - a) * t;

// A single handoff clock for the native anchors, optical capsules and window.
// Draw out the shared shoulder, pinch its neck, then settle the material.
// All origins are live samples, so a new intent never restarts at a stale pose.
export function sampleTabTransfer(from, to, previous, next, progress, startAttachment = 1, startNeck = {}) {
  const p = clamp(progress);
  const release = ease(0, .24, p), join = ease(.42, .68, p, MOTION.settle);
  const attachment = mix(startAttachment, .32, release) + .68 * join;
  const pulse = (start, peak, end) => ease(start, peak, p) * (1 - ease(peak, end, p));
  const q = clamp((p - .62) / .38);
  const inherited = 1 - ease(0, .20, p);
  const neck = {
    pull: (startNeck.pull || 0) * inherited + 34 * pulse(.02, .16, .34) + 48 * pulse(.30, .48, .68),
    pinch: (startNeck.pinch || 0) * inherited + .85 * pulse(.08, .22, .36) + .85 * pulse(.38, .54, .70),
    wobble: (startNeck.wobble || 0) * inherited + (p >= 1 ? 0 : 10 * Math.sin(q * Math.PI * 3) * Math.exp(-q * 2) * (1 - q)),
  };
  const poses = from.map((source, i) => {
    if (p === 0) return { ...source };
    const target = to[i], incoming = i === next, outgoing = i === previous;
    const travel = incoming ? ease(.22, .60, p, MOTION.settle) : ease(outgoing ? .18 : .08, .60, p, MOTION.settle);
    const shape = incoming ? ease(.20, .60, p) : ease(.08, .44, p);
    // Strain belongs to matter only, never the text or hit target.
    const strain = incoming ? Math.sin(Math.PI * ease(.20, .60, p)) * .10 : 0;
    const merge = incoming ? mix(source.merge, 1, join) : source.merge * (1 - release);
    return {
      x: mix(source.x, target.x, travel), y: mix(source.y, target.y, travel),
      width: mix(source.width, target.width, shape) * (1 + strain),
      height: mix(source.height, target.height, shape) / (1 + strain * .35),
      strain: (source.strain || 0) * (1 - release) + (incoming ? .8 * pulse(.30, .46, .68) : outgoing ? .65 * pulse(.02, .14, .28) : 0),
      merge: clamp(merge), label: incoming ? mix(source.label, 1, ease(.36, .58, p)) : source.label * (1 - ease(.02, .16, p)),
    };
  });
  return { poses, neck, attachment: clamp(attachment), mix: ease(.24, .88, p), progress: p };
}

// Close/reopen interrupts the handoff too. Retain the sampled optical volume
// while the existing whole-window animation carries it to its destination.
export function sampleTabContinuation(from, to, next, progress, startAttachment, startNeck = {}) {
  const p = clamp(progress), t = sampleBezier(MOTION.settle, p);
  return { progress: p, mix: t, neck: { pull: (startNeck.pull || 0) * (1 - t), pinch: (startNeck.pinch || 0) * (1 - t), wobble: (startNeck.wobble || 0) * (1 - t) }, attachment: mix(startAttachment, next === null ? 0 : 1, t),
    poses: from.map((source, i) => ({
      x: mix(source.x, to[i].x, t), y: mix(source.y, to[i].y, t),
      width: mix(source.width, to[i].width, t), height: mix(source.height, to[i].height, t),
      strain: (source.strain || 0) * (1 - t),
      merge: mix(source.merge, i === next ? 1 : 0, t), label: mix(source.label, to[i].label ?? (i === next ? 1 : 0), t),
    })),
  };
}

// One carrier turns from the full pill into a thin reading film with a dense lip.
// Coordinates are document-space centers; only material samples this path.
export function sampleWindowMorph(from, to, progress, opening, startContent = opening ? 0 : 1) {
  const p = clamp(progress);
  const contentOpacity = opening ? mix(startContent, 1, ease(.48, .72, p, MOTION.effects)) : startContent * (1 - ease(0, .16, p, MOTION.effects));
  if (p === 0 || p === 1) return { progress: p, contentOpacity, shell: { ...(p === 0 ? from : to) } };
  // Withdrawal gathers the whole footprint on one continuous curve. An
  // ease-out after a hold made the large window collapse almost immediately.
  const withdrawal = sampleBezier(MOTION.withdraw, p);
  const travel = opening ? ease(.02, .80, p, MOTION.settle) : withdrawal;
  const spread = opening ? ease(.04, .76, p, MOTION.settle) : withdrawal;
  const draw = opening ? ease(.12, .82, p, MOTION.settle) : withdrawal;
  const pulse = (a, b, c) => ease(a, b, p) * (1 - ease(b, c, p));
  const inherit = 1 - ease(0, .25, p), q = clamp((p - .68) / .32);
  const neck = {
    pull: (from.neck?.pull || 0) * inherit + (opening ? 44 : 36) * pulse(.12, .36, .72),
    pinch: (from.neck?.pinch || 0) * inherit + .8 * pulse(.26, .50, .76),
    wobble: (from.neck?.wobble || 0) * inherit + (opening ? 8 : 4) * Math.sin(q * Math.PI * 3) * Math.exp(-q * 2) * (1 - q),
  };
  return { progress: p, contentOpacity, shell: {
    x: mix(from.x, to.x, travel), y: mix(from.y, to.y, travel),
    width: mix(from.width, to.width, spread), height: mix(from.height, to.height, draw),
    radius: mix(from.radius, to.radius, draw), openness: mix(from.openness, to.openness, draw),
    attachment: mix(from.attachment, to.attachment, ease(.18, .76, p, MOTION.settle)), neck,
  } };
}
