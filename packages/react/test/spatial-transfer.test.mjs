import test from 'node:test';
import assert from 'node:assert/strict';
import { stepFolderAttention, densityFieldProfile } from '../src/renderer/density-field.js';

const region = { width: 400, height: 240, amount: .94, edge: 5, folder: true, fold: 1 };
const first = { id: 'value', x: 90, y: -20, width: 58, height: 44 };
const second = { id: 'thumb', x: -70, y: -70, width: 22, height: 22 };
const input = receiver => ({ hover: true, childActive: true, width: region.width, height: region.height, receiver });
const weight = (sample, id) => sample.transfer.receivers.find(entry => entry.id === id)?.weight ?? 0;
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const begin = () => { const body = {}; stepFolderAttention(body, { hover: true }, 0, { initialCurrent: .7 }); return body; };

test('a transfer changes spatial material instead of merely reporting a new state', () => {
  const transfer = { point: { x: 120, y: -20 }, source: { x: 193, y: -20 }, flow: 1, borrowed: .6 };
  const basePacket = densityFieldProfile(120, -20, region), baseDonor = densityFieldProfile(193, -20, region);
  const packet = densityFieldProfile(120, -20, { ...region, transfer });
  const donor = densityFieldProfile(193, -20, { ...region, transfer });
  assert.ok(packet.height > basePacket.height + 1, 'the traveling material is visible positive relief');
  assert.ok(donor.height < baseDonor.height - .2, 'the source visibly withdraws its own material');
  const plain = { ...region, folder: false };
  for (const [x, y] of [[120, -20], [193, -20]]) {
    assert.deepEqual(densityFieldProfile(x, y, { ...plain, transfer }), densityFieldProfile(x, y, plain), 'other material roles do not inherit folder transport');
  }
});

test('attention carries a finite packet from the folder into the actual receiver', () => {
  const body = begin(), nativeBounds = { ...first };
  const halfway = stepFolderAttention(body, input(first), .21);
  assert.ok(halfway.transfer, 'context gain alone cannot communicate spatial borrowing');
  const { source, point, flow, borrowed } = halfway.transfer;
  assert.ok(distance(point, source) > 1 && distance(point, first) > 1, 'the material has a displayed position between donor and receiver');
  assert.ok(flow > 0 && flow <= 1 && borrowed > 0 && borrowed < 1);
  const arrived = stepFolderAttention(body, input(first), .5);
  assert.ok(distance(arrived.transfer.point, first) < 1e-9);
  assert.equal(arrived.transfer.borrowed, 1);
  assert.equal(arrived.transfer.flow, 0, 'a settled control is not a perpetual pulse');
  assert.equal(weight(arrived, first.id), 1);
  assert.deepEqual(first, nativeBounds, 'transport does not rewrite the native target bounds');
});

test('leaving returns borrowed mass along its route despite retained pointer-focus context', () => {
  const body = begin();
  const arrived = stepFolderAttention(body, input(first), .5);
  assert.ok(arrived.transfer);
  const returning = stepFolderAttention(body, input(null), .14);
  assert.equal(returning.gain, .12, 'contextual focus can stay quiet while spatial material returns');
  assert.ok(distance(returning.transfer.point, returning.transfer.source) < distance(arrived.transfer.point, arrived.transfer.source));
  assert.ok(returning.transfer.flow > 0 && returning.transfer.borrowed > 0 && returning.transfer.borrowed < 1);
  assert.ok(weight(returning, first.id) > 0 && weight(returning, first.id) < 1);
  const stillReturning = stepFolderAttention(body, input(null), .14);
  assert.ok(stillReturning.transfer.borrowed > 0 && distance(stillReturning.transfer.point, stillReturning.transfer.source) > 0, 'spatial return retains its420ms withdrawal even when the contextual gain stays constant');
  const returned = stepFolderAttention(body, input(null), .14);
  assert.equal(returned.transfer.borrowed, 0);
  assert.equal(returned.transfer.flow, 0);
  assert.deepEqual(returned.transfer.point, returned.transfer.source);
  assert.equal(weight(returned, first.id), 0);
  for (const [x, y] of [[0, 0], [193, -20], [90, -20]]) {
    assert.deepEqual(densityFieldProfile(x, y, { ...region, transfer: returned.transfer }), densityFieldProfile(x, y, region));
  }
});

test('retargeting retains the displayed field and discharges the old receiver continuously', () => {
  const body = begin();
  const arrived = stepFolderAttention(body, input(first), .5);
  assert.ok(arrived.transfer);
  assert.deepEqual(stepFolderAttention(body, input(second), 0), arrived, 'a new target cannot reset the old packet or receiver share');
  const between = stepFolderAttention(body, input(second), .1);
  assert.ok(distance(between.transfer.point, first) > 0 && distance(between.transfer.point, second) > 0);
  assert.ok(weight(between, first.id) > 0 && weight(between, first.id) < 1);
  assert.ok(weight(between, second.id) > 0 && weight(between, second.id) < 1);
  const reversing = stepFolderAttention(body, input(first), 0);
  assert.deepEqual(reversing, between, 'interruption starts at the visible packet, light and allocations');
  for (const sample of [between, reversing]) {
    assert.ok(sample.transfer.receivers.length <= 32);
    assert.ok(sample.transfer.receivers.every(entry => Number.isFinite(entry.weight) && entry.weight >= 0 && entry.weight <= 1));
    assert.ok(sample.transfer.receivers.reduce((sum, entry) => sum + entry.weight, 0) <= 1 + 1e-9);
  }
});

test('same-owner native movement updates its endpoint without restarting arrival', () => {
  const body = begin();
  const original = stepFolderAttention(body, input(first), .5);
  assert.ok(original.transfer);
  const moved = { ...first, x: first.x - 35 };
  const follows = stepFolderAttention(body, input(moved), 0);
  assert.deepEqual(follows.transfer.point, { x: moved.x, y: moved.y });
  assert.equal(follows.transfer.flow, 0);
  assert.equal(follows.transfer.borrowed, 1);
  assert.equal(weight(follows, first.id), 1);
});

test('context-only changes cannot create a new pulse or change a settled receiver share', () => {
  const body = begin();
  stepFolderAttention(body, input(first), .5);
  const contextChanged = stepFolderAttention(body, { ...input(first), childActive: false }, .14);
  assert.equal(contextChanged.transfer.flow, 0, 'unchanged settled spatial ownership has no new packet to emit');
  assert.equal(weight(contextChanged, first.id), 1, 'context alone cannot discharge the settled receiver');
  assert.equal(contextChanged.transfer.borrowed, 1);
  assert.deepEqual(contextChanged.transfer.point, { x: first.x, y: first.y });
  const inFlightBody = begin();
  const inFlight = stepFolderAttention(inFlightBody, input(first), .14);
  const contextRetarget = stepFolderAttention(inFlightBody, { ...input(first), childActive: false }, .01);
  assert.ok(weight(contextRetarget, first.id) >= weight(inFlight, first.id), 'a same-ID arrival cannot briefly discharge its receiver when context changes');
  stepFolderAttention(body, input(first), .5);
  const returned = stepFolderAttention(body, input(null), .5);
  assert.ok(returned.transfer);
  assert.equal(returned.transfer.borrowed, 0);
  const approach = stepFolderAttention(body, { hover: true, width: 400, height: 240 }, .14);
  assert.equal(approach.transfer.flow, 0, 'context gain alone has no material to transport');
  assert.equal(approach.transfer.borrowed, 0);
  assert.deepEqual(approach.transfer.receivers, []);
  const { x, y } = approach.transfer.source;
  assert.deepEqual(densityFieldProfile(x, y, { ...region, transfer: approach.transfer }), densityFieldProfile(x, y, region));
});

test('resizing keeps the donor on the current folder and preserves the remaining return route', () => {
  const body = begin();
  stepFolderAttention(body, input(first), .5);
  const native = { ...first, x: 60 };
  const resized = stepFolderAttention(body, { ...input(native), width: 220, height: 180 }, 0);
  assert.ok(resized.transfer);
  assert.equal(resized.transfer.source.x, 103, 'the donor stays inset from the current right shoulder');
  assert.ok(resized.transfer.source.y <= 32 && resized.transfer.source.y >= -68);
  assert.deepEqual(resized.transfer.point, { x: native.x, y: native.y }, 'the actual same-ID native receiver remains authoritative');
  assert.equal(resized.transfer.flow, 0);
  const returning = stepFolderAttention(body, { ...input(null), width: 220, height: 180 }, .14);
  const rebased = stepFolderAttention(body, { ...input(null), width: 300, height: 200 }, 0);
  assert.equal(rebased.transfer.source.x, 143);
  assert.ok(Math.abs(distance(rebased.transfer.point, rebased.transfer.source) - distance(returning.transfer.point, returning.transfer.source)) < 1e-9);
  assert.equal(rebased.transfer.borrowed, returning.transfer.borrowed);
  assert.equal(rebased.transfer.flow, returning.transfer.flow);
});

test('the traveling packet and donor alter real density with matching bounded derivatives', () => {
  const body = begin(), sample = stepFolderAttention(body, input(first), .21);
  assert.ok(sample.transfer);
  const active = { ...region, transfer: sample.transfer };
  const at = (x, y) => densityFieldProfile(x, y, active);
  const difference = p => at(p.x, p.y).height - densityFieldProfile(p.x, p.y, region).height;
  assert.ok(difference(sample.transfer.point) > .15, 'the transfer is actual relief rather than a tint or amplitude fade');
  assert.ok(difference(sample.transfer.source) < -.05, 'the folder visibly lends material rather than duplicating it');
  for (let y = -110; y <= 110; y += 11) for (let x = -210; x <= 210; x += 11) {
    const current = at(x, y), base = densityFieldProfile(x, y, region);
    const change = current.height - base.height;
    assert.ok(change >= -.91 && change <= 1.81 && Object.values(current).every(Number.isFinite));
  }
  for (const p of [sample.transfer.point, sample.transfer.source]) for (const [ox, oy] of [[5, 3], [-9, 2]]) {
    const x = p.x + ox, y = p.y + oy, current = at(x, y), epsilon = .001;
    const dx = (at(x + epsilon, y).height - at(x - epsilon, y).height) / (2 * epsilon);
    const dy = (at(x, y + epsilon).height - at(x, y - epsilon).height) / (2 * epsilon);
    assert.ok(Math.abs(current.dx - dx) < .002 && Math.abs(current.dy - dy) < .002, 'lighting/refraction slope must follow the transported field');
  }
  assert.deepEqual(at(0, 0), densityFieldProfile(0, 0, region), 'unrelated reading material stays quiet outside finite transfer support');
  assert.deepEqual(at(-230, 100), densityFieldProfile(-230, 100, region));
});

test('pausing retains the shared phase and reduced motion settles spatial state without circulation', () => {
  const body = begin(), underway = stepFolderAttention(body, input(first), .1);
  assert.ok(underway.transfer);
  const paused = stepFolderAttention(body, input(first), .1, { moving: false });
  assert.equal(paused.current, underway.current);
  const reduced = stepFolderAttention(body, input(second), .1, { instant: true });
  assert.equal(reduced.current, paused.current);
  assert.deepEqual(reduced.transfer.point, { x: second.x, y: second.y });
  assert.equal(reduced.transfer.flow, 0);
  assert.equal(weight(reduced, second.id), 1);
  const exited = stepFolderAttention(body, { hover: false, childActive: false, width: 400, height: 240 }, .1, { instant: true });
  assert.equal(exited.gain, 0);
  assert.equal(exited.transfer.borrowed, 0);
  assert.equal(exited.transfer.flow, 0);
});
