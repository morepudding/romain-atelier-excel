import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildJevDecisionRequest,
  parseJevAssessment,
} from '../lib/radar/jev.ts';
import { reworkDataSchema } from '../lib/radar/rework.ts';

void test('Jev receives only the minimum recorded prospect facts and uses conservative choices', () => {
  const data = reworkDataSchema.parse({
    name: 'Maison témoin',
    locality: 'Vairé',
    sector: 'hotel',
    siren: '123456789',
    website: 'https://hotel.example/private-path?token=hidden',
    site_state: 'existing',
    project_type: 'refonte',
    observations: 'La réservation est difficile à trouver.',
    initial_assessment: 'Le site est nul.',
    user_reason: 'Avis privé.',
    angle: 'Changer toute la direction visuelle.',
  });
  const request = buildJevDecisionRequest(data);
  const serialized = JSON.stringify(request);
  assert.equal(request.model, 'typesafe/jev-1.13');
  assert.equal(request.state.business, 'Maison témoin');
  assert.equal(
    request.state.recorded_observations,
    'La réservation est difficile à trouver.',
  );
  assert.match(
    request.questions.triage.instructions,
    /Si les indices sont incomplets ou ambigus/,
  );
  assert.match(request.questions.triage.criteria.review, /incertain/);
  assert.doesNotMatch(
    serialized,
    /123456789|hotel\.example|private-path|token=hidden|Avis privé|Changer toute/,
  );
});

void test('Jev response parsing returns the typed recommendation, probabilities and actual cost', () => {
  const result = parseJevAssessment({
    answers: {
      triage: {
        type: 'choice',
        choice: 'review',
        probabilities: { retain: 0.31, review: 0.62, discard: 0.07 },
      },
    },
    usage: { cost: 0.00002, input_tokens: 480 },
  });
  assert.deepEqual(result, {
    choice: 'review',
    probabilities: { retain: 0.31, review: 0.62, discard: 0.07 },
    costUsd: 0.00002,
    inputTokens: 480,
  });
});

void test('invalid or incomplete Jev probabilities are rejected', () => {
  assert.equal(
    parseJevAssessment({
      answers: {
        triage: {
          type: 'choice',
          choice: 'retain',
          probabilities: { retain: 1 },
        },
      },
    }),
    null,
  );
  assert.equal(parseJevAssessment({ answers: {} }), null);
});
