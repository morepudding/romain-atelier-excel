import { z } from 'zod';
import {
  projectTypes,
  reworkDataSchema,
  sectors,
  siteStates,
} from './rework.ts';

export const jevChoices = ['retain', 'review', 'discard'] as const;
export type JevChoice = (typeof jevChoices)[number];

export type JevAssessment = {
  choice: JevChoice;
  probabilities: Record<JevChoice, number>;
  costUsd: number | null;
  inputTokens: number | null;
};

const choiceAnswer = z.object({
  type: z.literal('choice'),
  choice: z.enum(jevChoices),
  probabilities: z.record(z.string(), z.number().min(0).max(1)),
});

const decisionsResponse = z.object({
  answers: z.object({ triage: choiceAnswer }),
  usage: z
    .object({
      cost: z.number().nonnegative().optional(),
      input_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});

export function buildJevDecisionRequest(input: unknown) {
  const data = reworkDataSchema.parse(input);
  const evidence = data.observations
    .split('')
    .map((character) => {
      const code = character.charCodeAt(0);
      return code < 32 || code === 127 ? ' ' : character;
    })
    .join('')
    .slice(0, 2200)
    .trim();

  return {
    model: 'typesafe/jev-1.13',
    state: {
      business: data.name.slice(0, 180),
      sector: sectors[data.sector],
      locality: data.locality.slice(0, 120),
      site_status: siteStates[data.site_state],
      project_type: projectTypes[data.project_type],
      recorded_observations:
        evidence || 'Aucune observation détaillée enregistrée.',
    },
    questions: {
      triage: {
        type: 'choice' as const,
        instructions:
          'À partir uniquement des faits enregistrés, quelle décision convient pour ce prospect de création ou refonte de site ? Ne déduis pas son budget ni son envie d’acheter. Une préférence esthétique vague ne suffit pas. Si les indices sont incomplets ou ambigus, choisis « review ».',
        criteria: {
          retain:
            'Retenir : les faits montrent une possibilité concrète et importante d’améliorer l’accès à l’offre, aux informations pratiques, à la réservation ou au contact. Une absence de site professionnel peut compter si elle est explicitement constatée et cohérente avec l’activité.',
          review:
            'À revoir : la piste est plausible, mais les faits ne suffisent pas à confirmer une amélioration importante, ou un élément clé reste incertain.',
          discard:
            'Écarter : les faits montrent que le site répond déjà aux besoins essentiels et ne révèlent aucun manque matériel, ou que la seule critique est une préférence de goût.',
        },
      },
    },
  };
}

export function parseJevAssessment(input: unknown): JevAssessment | null {
  const parsed = decisionsResponse.safeParse(input);
  if (!parsed.success) return null;
  const { choice, probabilities } = parsed.data.answers.triage;
  const ordered = Object.fromEntries(
    jevChoices.map((key) => [key, probabilities[key]]),
  ) as Record<JevChoice, number>;
  if (jevChoices.some((key) => ordered[key] === undefined)) return null;
  const total = Object.values(ordered).reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 1) > 0.03) return null;
  return {
    choice,
    probabilities: ordered,
    costUsd: parsed.data.usage?.cost ?? null,
    inputTokens: parsed.data.usage?.input_tokens ?? null,
  };
}
