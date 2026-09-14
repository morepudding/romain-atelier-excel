import { reworkDataSchema, type ReworkData } from './rework.ts';

export type PreparationStep = 'brief' | 'a' | 'b';
export function hasProposal(data: ReworkData, slot: 'a' | 'b') {
  return !!(
    data.pages?.[slot] ||
    data.images[slot] ||
    (slot === 'a' && data.interactive_url)
  );
}
export function comparisonReady(data: ReworkData) {
  if (data.presentation === 'single')
    return !!data.interactive_url && !!(data.pages.a || data.images.a);
  return hasProposal(data, 'a') && hasProposal(data, 'b');
}
export function preparationStep(data: ReworkData): PreparationStep | null {
  if (data.decision !== 'retained' || data.selected_direction) return null;
  if (comparisonReady(data)) return null;
  if (
    !data.brief ||
    !data.direction_a ||
    (data.presentation !== 'single' && !data.direction_b)
  )
    return 'brief';
  return data.presentation === 'single'
    ? 'a'
    : hasProposal(data, 'a')
      ? 'b'
      : 'a';
}
export function canPrepare(data: ReworkData, now = Date.now()) {
  return (
    preparationStep(data) !== null &&
    data.automation?.status !== 'error' &&
    (data.automation?.lease_until || 0) <= now &&
    (data.automation?.attempts || 0) < 9
  );
}
export function decide(data: ReworkData, decision: ReworkData['decision']) {
  const enqueue =
    decision === 'retained' &&
    !data.selected_direction &&
    !comparisonReady(data);
  // A human action cancels any in-flight lease. Its eventual result cannot overwrite this revision.
  return reworkDataSchema.parse({
    ...data,
    decision,
    presentation: enqueue ? 'single' : data.presentation,
    automation: enqueue
      ? {
          ...data.automation,
          workflow: 'interactive-v1',
          status: 'queued',
          step: 'brief',
          lease: '',
          lease_until: 0,
          attempts: 0,
          error: '',
        }
      : data.automation
        ? {
            ...data.automation,
            lease: '',
            lease_until: 0,
            status: comparisonReady(data) ? 'ready' : 'queued',
            error: '',
          }
        : undefined,
  });
}
export function choose(data: ReworkData, direction: 'a' | 'b') {
  if (
    data.decision !== 'retained' ||
    !comparisonReady(data) ||
    (data.presentation === 'single' && direction !== 'a')
  )
    throw new Error(
      data.presentation === 'single'
        ? 'La proposition doit être disponible avant de la valider.'
        : 'Les deux propositions doivent être disponibles avant de choisir.',
    );
  return { ...data, selected_direction: direction };
}
export function revise(data: ReworkData, instruction: string) {
  if (data.decision !== 'retained' || !instruction.trim())
    throw new Error('Précisez le changement souhaité.');
  return reworkDataSchema.parse({
    ...data,
    brief: '',
    direction_a: '',
    direction_b: '',
    selected_direction: '',
    images: { ...data.images, a: '', b: '' },
    pages: { a: '', b: '' },
    interactive_url: '',
    presentation: 'single',
    automation: {
      workflow: 'interactive-v1',
      instruction: instruction.trim(),
      status: 'queued',
    },
  });
}
export const preparationLabels = {
  brief: 'Lecture du site et préparation du brief',
  a: 'Création de la proposition A',
  b: 'Création de la proposition B',
};
