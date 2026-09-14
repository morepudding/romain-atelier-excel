import test from 'node:test';
import assert from 'node:assert/strict';
import { reworkDataSchema } from '../lib/radar/rework.ts';
import {
  canPrepare,
  preparationStep,
  decide,
  choose,
  revise,
} from '../lib/radar/rework-flow.ts';

void test('the two human decisions gate generation and selection without replacing previous observations', () => {
  const review = reworkDataSchema.parse({
    name: 'Entreprise témoin',
    observations: 'Menu peu lisible',
    user_reason: 'Garder les photos',
    initial_assessment: 'Écarter',
  });
  assert.equal(canPrepare(review), false);
  const retained = decide(review, 'retained');
  assert.equal(canPrepare(retained), true);
  assert.equal(preparationStep(retained), 'brief');
  assert.equal(retained.observations, review.observations);
  assert.equal(retained.initial_assessment, 'Écarter');
  assert.equal(retained.user_reason, 'Garder les photos');
  assert.throws(() => choose(retained, 'a'));
  const withBrief = {
    ...retained,
    brief: 'brief',
    direction_a: 'A',
    direction_b: 'B',
  };
  assert.equal(preparationStep(withBrief), 'a');
  const withA = {
    ...withBrief,
    images: { before: 'ref', a: 'first.png', b: '' },
  };
  assert.equal(preparationStep(withA), 'b');
  assert.throws(() => choose(withA, 'a'));
  const ready = { ...withA, images: { ...withA.images, b: 'second.png' } };
  assert.equal(canPrepare(ready), false);
  const chosen = choose(ready, 'b');
  assert.equal(chosen.selected_direction, 'b');
  assert.equal(canPrepare(chosen), false);
  assert.equal(canPrepare(decide(withA, 'discarded')), false);
});

void test('live leases and failed attempts cannot silently start duplicate paid calls', () => {
  const data = reworkDataSchema.parse({
    name: 'Entreprise témoin',
    decision: 'retained',
    automation: { status: 'working', lease_until: 1000, attempts: 1 },
  });
  assert.equal(canPrepare(data, 999), false);
  assert.equal(canPrepare(data, 1001), true);
  assert.equal(
    canPrepare(
      { ...data, automation: { ...data.automation!, status: 'error' } },
      1001,
    ),
    false,
  );
  assert.equal(
    canPrepare(
      { ...data, automation: { ...data.automation!, attempts: 9 } },
      1001,
    ),
    false,
  );
  const discarded = decide(data, 'discarded');
  assert.equal(discarded.automation!.lease_until, 0);
  assert.equal(canPrepare(discarded, 1001), false);
});

void test('a requested refinement preserves evidence and reference, and resets only the generated proposal', () => {
  const data = reworkDataSchema.parse({
    name: 'Entreprise témoin',
    decision: 'retained',
    brief: 'Ancien brief',
    images: { before: 'reference.png', a: 'old-a.png', b: 'old-b.png' },
    selected_direction: 'a',
    user_reason: 'Un site plus lisible',
  });
  const next = revise(data, 'Plus de place aux images');
  assert.equal(next.images.before, 'reference.png');
  assert.equal(next.images.a, '');
  assert.equal(next.user_reason, data.user_reason);
  assert.equal(next.automation?.instruction, 'Plus de place aux images');
  assert.equal(next.selected_direction, '');
  assert.equal(preparationStep(next), 'brief');
  assert.equal(data.images.a, 'old-a.png');
});
