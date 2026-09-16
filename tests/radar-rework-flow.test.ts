import test from 'node:test';
import assert from 'node:assert/strict';
import { reworkDataSchema } from '../lib/radar/rework.ts';
import {
  canPrepare,
  preparationStep,
  decide,
  choose,
  revise,
  snooze,
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
  assert.equal(canPrepare(retained), false);
  assert.equal(preparationStep(retained), 'brief');
  assert.equal(retained.observations, review.observations);
  assert.equal(retained.initial_assessment, 'Écarter');
  assert.equal(retained.user_reason, 'Garder les photos');
  assert.throws(() => choose(retained, 'a'));
  assert.equal(retained.presentation, 'pair');
  assert.equal(retained.automation, undefined);
  const withBrief = {
    ...retained,
    presentation: 'pair' as const,
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

void test('triage decisions are persistent without enqueueing work, and snooze moves a review to the end', () => {
  const first = reworkDataSchema.parse({ name: 'Première entreprise' });
  const second = reworkDataSchema.parse({ name: 'Deuxième entreprise' });
  const later = snooze(first, '2026-09-16T18:00:00.000Z');
  assert.equal(later.decision, 'review');
  assert.equal(later.triage_snoozed_at, '2026-09-16T18:00:00.000Z');
  assert.equal(decide(later, 'retained').triage_snoozed_at, '');
  assert.equal(decide(second, 'discarded').automation, undefined);
  const queued = reworkDataSchema.parse({
    name: 'File historique',
    automation: { workflow: 'interactive-v1', status: 'queued' },
  });
  assert.equal(decide(queued, 'retained').automation?.status, 'error');
  assert.equal(canPrepare(decide(queued, 'retained')), false);
});

void test('live leases and failed attempts cannot silently start duplicate paid calls', () => {
  const data = reworkDataSchema.parse({
    name: 'Entreprise témoin',
    decision: 'retained',
    automation: {
      workflow: 'interactive-v1',
      status: 'working',
      lease_until: 1000,
      attempts: 1,
    },
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

void test('private HTML proposals support comparison, selection and revision without image paths', () => {
  const data = reworkDataSchema.parse({
    name: 'Page témoin',
    decision: 'retained',
    pages: {
      a: '00000000-0000-4000-8000-000000000001',
      b: '00000000-0000-4000-8000-000000000002',
    },
  });
  assert.equal(preparationStep(data), null);
  assert.equal(canPrepare(data), false);
  assert.equal(choose(data, 'b').selected_direction, 'b');
  const revised = revise(data, 'Plus de photos');
  assert.deepEqual(revised.pages, { a: '', b: '' });
  assert.notEqual(data.pages.a, '');
  assert.throws(() =>
    choose({ ...data, pages: { ...data.pages, b: '' } }, 'a'),
  );
});

void test('one interactive proposal is sufficient only for the explicit single presentation', () => {
  const data = reworkDataSchema.parse({
    name: 'Proposition unique',
    decision: 'retained',
    presentation: 'single',
    interactive_url: 'https://example.com/maquette',
    pages: { a: '00000000-0000-4000-8000-000000000001', b: '' },
  });
  assert.equal(preparationStep(data), null);
  assert.equal(canPrepare(data), false);
  assert.equal(choose(data, 'a').selected_direction, 'a');
  assert.throws(() => choose(data, 'b'));
  const revised = revise(data, 'Ajuster les couleurs');
  assert.equal(revised.presentation, 'single');
  assert.equal(revised.interactive_url, '');
  assert.equal(preparationStep(revised), 'brief');
  const pair = reworkDataSchema.parse({
    name: 'Comparaison',
    decision: 'retained',
    interactive_url: data.interactive_url,
  });
  assert.equal(pair.presentation, 'pair');
  assert.throws(() => choose(pair, 'a'));
  assert.equal(
    reworkDataSchema.safeParse({
      ...data,
      interactive_url: 'javascript:alert(1)',
    }).success,
    false,
  );
});

void test('the official workflow preserves finished pairs, requires link and preview, and queues corrections once', () => {
  const old = reworkDataSchema.parse({
    name: 'Ancien dossier',
    decision: 'retained',
    pages: {
      a: '00000000-0000-4000-8000-000000000001',
      b: '00000000-0000-4000-8000-000000000002',
    },
  });
  assert.equal(decide(old, 'retained').presentation, 'pair');
  assert.equal(decide(old, 'retained').automation, undefined);
  const queued = revise(old, 'Une entrée plus forte');
  assert.equal(queued.presentation, 'single');
  assert.equal(queued.automation?.workflow, 'interactive-v1');
  assert.equal(queued.automation?.artifact_path, '');
  const cover = {
    ...queued,
    brief: 'Brief',
    direction_a: 'Direction',
    pages: { ...queued.pages, a: old.pages.a },
  };
  assert.equal(preparationStep(cover), 'a');
  assert.throws(() => choose(cover, 'a'));
  const linkOnly = { ...queued, interactive_url: 'https://example.com/' };
  assert.throws(() => choose(linkOnly, 'a'));
  assert.equal(
    choose({ ...cover, interactive_url: 'https://example.com/' }, 'a')
      .selected_direction,
    'a',
  );
  assert.deepEqual(old.pages, {
    a: '00000000-0000-4000-8000-000000000001',
    b: '00000000-0000-4000-8000-000000000002',
  });
});
