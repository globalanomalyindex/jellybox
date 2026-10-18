import test from 'node:test';
import assert from 'node:assert/strict';
import { stepFolderAttention, densityFieldProfile } from '../src/renderer/density-field.js';
import { MOTION } from '../src/renderer/motion.js';

test('child ownership keeps a faint parent presence while true exit reaches rest', () => {
  const body = {};
  stepFolderAttention(body, { hover: true }, 0, { initialCurrent: 1.3 });
  const child = stepFolderAttention(body, { hover: true, childActive: true }, .5);
  assert.equal(child.gain, .12, 'the child wins without extinguishing its parent material');
  const held = stepFolderAttention(body, { childActive: true }, .5);
  assert.deepEqual(held, child, 'retained child ownership keeps the quiet floor even outside the group');
  const exited = stepFolderAttention(body, {}, .5);
  assert.equal(exited.gain, 0, 'true exit has no residual invitation');
});

test('withdrawal lends energy gradually while the child gathers', () => {
  const body = {};
  stepFolderAttention(body, { hover: true }, 0);
  const first = stepFolderAttention(body, { childActive: true }, 1 / 60);
  assert.ok(first.gain > .98 && first.gain < 1, 'the first frame does not lose a quarter of the parent mass');
  const middle = stepFolderAttention(body, { childActive: true }, .1 - 1 / 60);
  assert.ok(middle.gain > .7 && middle.gain < .9, 'the parent remains present during early child gathering');
  const late = stepFolderAttention(body, { childActive: true }, .1);
  assert.ok(late.gain > .2 && late.gain < .5);
  const settled = stepFolderAttention(body, { childActive: true }, .22);
  assert.equal(settled.gain, .12, 'the authored withdrawal finishes rather than asymptotically drifting');
});

test('interrupted handoffs retain the displayed gain and current phase', () => {
  const body = {};
  stepFolderAttention(body, { hover: true }, 0, { initialCurrent: 1.6 });
  const outgoing = stepFolderAttention(body, { childActive: true }, .12);
  const reversal = stepFolderAttention(body, { hover: true }, 0, { initialCurrent: 20 });
  assert.deepEqual(reversal, outgoing, 'a new owner does not reset the material to an endpoint or scene angle');
  const recovering = stepFolderAttention(body, { hover: true }, .1);
  assert.ok(recovering.gain > reversal.gain && recovering.gain < 1);
  assert.deepEqual(stepFolderAttention(body, { childActive: true }, 0), recovering);
  assert.equal(stepFolderAttention(body, { hover: true }, .28).gain, 1);
});

test('the same material envelope brakes the current, then resumes its retained angle', () => {
  const body = {}, omega = Math.PI * 2 / (MOTION.activityOrbit / 1000);
  let previous = stepFolderAttention(body, { hover: true }, 0, { initialCurrent: .7 });
  let previousSpeed = omega;
  for (let frame = 0; frame < 21; frame++) {
    const next = stepFolderAttention(body, { childActive: true }, .02);
    const speed = (next.current - previous.current) / .02;
    assert.ok(speed >= -1e-9 && speed <= previousSpeed + 1e-8, 'circulation brakes without a phase jump or acceleration kick');
    assert.ok(speed <= omega + 1e-8);
    previous = next; previousSpeed = speed;
  }
  const quiet = stepFolderAttention(body, { childActive: true }, .4);
  assert.equal(quiet.current, previous.current, 'the child floor has no competing traveling crest');
  assert.deepEqual(stepFolderAttention(body, { hover: true }, 0), quiet);
  const resumed = stepFolderAttention(body, { hover: true }, .14);
  assert.ok(resumed.current > quiet.current && resumed.current - quiet.current <= omega * .14);
});

test('pause and reduced motion retain phase while acknowledging native ownership', () => {
  const body = {};
  const initial = stepFolderAttention(body, { hover: true }, 0, { initialCurrent: 2.4 });
  const paused = stepFolderAttention(body, { childActive: true }, .1, { moving: false });
  assert.equal(paused.current, initial.current);
  assert.ok(paused.gain < initial.gain && paused.gain > .12);
  const reduced = stepFolderAttention(body, { childActive: true }, .1, { instant: true });
  assert.deepEqual(reduced, { gain: .12, current: initial.current });
  assert.deepEqual(stepFolderAttention(body, {}, .1, { instant: true }), { gain: 0, current: initial.current });
});

test('the residual invitation stays in the real shoulder and leaves the reading plateau unchanged', () => {
  const body = {};
  const residual = stepFolderAttention(body, { childActive: true }, 0, { initialCurrent: 1.2 });
  const region = { width: 400, height: 220, amount: .94, edge: 5, folder: true, fold: 1 };
  const quiet = { ...region, hover: residual.gain, current: residual.current };
  assert.deepEqual(densityFieldProfile(0, 0, quiet), densityFieldProfile(0, 0, region));
  const change = densityFieldProfile(193, -20, quiet).height - densityFieldProfile(193, -20, region).height;
  assert.ok(change > 0 && change < .17, 'a faint material connection remains without changing structural bulk');
});
