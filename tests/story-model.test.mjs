import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollEdgeState } from '../src/scroll-presentation.js';

const reading = { viewportHeight: 720, documentHeight: 5000, scroll: 1000, storyTop: -200, credits: { top: -500, bottom: -400 } };
test('returning to the hero clears the cue even when more content remains', () => {
  assert.ok(scrollEdgeState(reading).strength > 0);
  const hero = scrollEdgeState({ ...reading, scroll: 0, storyTop: 800, credits: { top: 480, bottom: 648 } });
  assert.equal(hero.strength, 0);
  assert.equal(hero.active, false);
  assert.equal(hero.more, true);
  assert.equal(scrollEdgeState({ ...reading, scroll: 100, storyTop: 750 }).strength, 0);
});
test('the reading cue protects content, preferences and the end of the document', () => {
  assert.equal(scrollEdgeState({ ...reading, protected: true }).strength, 0);
  assert.equal(scrollEdgeState({ ...reading, transparent: true }).strength, 0);
  assert.equal(scrollEdgeState({ ...reading, credits: { top: 630, bottom: 715 } }).strength, 0);
  const end = scrollEdgeState({ ...reading, scroll: 4280 });
  assert.equal(end.more, false);
  assert.equal(end.strength, 0);
});
