import type { DemoState } from './types';

export const sequence: ReadonlyArray<{ at: number; state: DemoState }> = [
  { at: 1600, state: 'structured' },
  { at: 3400, state: 'procedure-found' },
  { at: 5100, state: 'assigned' },
  { at: 7900, state: 'reply-ready' },
];
export const stateOrder: DemoState[] = ['idle', 'extracting', 'structured', 'procedure-found', 'assigned', 'reply-ready', 'validated'];
export function hasReached(state: DemoState, target: DemoState): boolean {
  return stateOrder.indexOf(state) >= stateOrder.indexOf(target);
}
export function isRunning(state: DemoState): boolean {
  return state !== 'idle' && state !== 'reply-ready' && state !== 'validated';
}
export const statusText: Record<DemoState, string> = {
  idle: 'Une réclamation à traiter', extracting: 'Lecture du mail et des pièces jointes…',
  structured: 'Dossier créé. Recherche de la procédure…',
  'procedure-found': 'Procédure retrouvée. Recherche du responsable…',
  assigned: 'Sophie Bernard retenue. Préparation de la réponse…',
  'reply-ready': 'Dossier prêt à traiter', validated: 'Réponse validée — aucune donnée réelle n’a été envoyée',
};

export interface Scheduler { set: (callback: () => void, delay: number) => () => void }
export function scheduleWorkflow(onState: (state: DemoState) => void, scheduler: Scheduler): () => void {
  let cancelled = false;
  const cancelTimers = sequence.map(({ at, state }) => scheduler.set(() => {
    if (!cancelled) onState(state);
  }, at));
  return () => { cancelled = true; cancelTimers.forEach(cancel => cancel()); };
}
