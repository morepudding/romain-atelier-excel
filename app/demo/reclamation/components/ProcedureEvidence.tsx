import { BookOpen, ChevronDown } from 'lucide-react';
import type { Procedure } from '../types';

export function ProcedureEvidence({ procedure }: { procedure: Procedure }) {
  return <section className="procedure-section reveal" aria-labelledby="procedure-heading">
    <div className="section-heading"><BookOpen size={16} aria-hidden="true" /><h3 id="procedure-heading">{procedure.title}</h3><span className="reference">{procedure.id}</span></div>
    <blockquote>« {procedure.excerpt} »</blockquote>
    <details className="source-details"><summary>{procedure.source}<ChevronDown size={14} aria-hidden="true" /></summary><div className="source-content"><strong>{procedure.id} — {procedure.title}</strong><p>Section 3.2 · Défaut bloquant avec preuve photographique.</p><p>Mail reçu à 12 h, en période ouvrée. Le délai de quatre heures ouvrées fixe la réponse à 16 h.</p><span>Document interne fictif utilisé pour cette démonstration.</span></div></details>
  </section>;
}
