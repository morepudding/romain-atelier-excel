import { ArrowRight, Check, FileCheck2, FolderOpen, Inbox, UserRoundCheck, BookOpen } from 'lucide-react';
import type { DemoState } from '../types';
import { hasReached } from '../workflow';

const steps = [
  { label: 'Mail reçu', state: 'idle', icon: Inbox },
  { label: 'Dossier créé', state: 'structured', icon: FolderOpen },
  { label: 'Procédure retrouvée', state: 'procedure-found', icon: BookOpen },
  { label: 'Responsable choisi', state: 'assigned', icon: UserRoundCheck },
  { label: 'Réponse prête', state: 'reply-ready', icon: FileCheck2 },
] as const;
export function WorkflowProgress({ state }: { state: DemoState }) {
  const currentIndex = steps.reduce((result, step, index) => hasReached(state, step.state) ? index : result, 0);
  return <nav className="workflow" aria-label="Avancement du dossier"><ol>{steps.map((step, i) => {
    const done = hasReached(state, step.state);
    const Icon = done && i < currentIndex ? Check : step.icon;
    return <li key={step.state} className={`${done ? 'step-done' : ''} ${i === currentIndex ? 'step-current' : ''}`} aria-current={i === currentIndex ? 'step' : undefined}><span className="step-content"><span className="step-icon"><Icon size={17} aria-hidden="true" /></span><span>{step.label}</span></span>{i < steps.length - 1 && <ArrowRight size={16} className="step-arrow" aria-hidden="true" />}</li>;
  })}</ol></nav>;
}
