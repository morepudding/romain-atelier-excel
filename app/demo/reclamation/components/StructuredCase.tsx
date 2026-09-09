import { ArrowRight, Clock3, FolderOpen, Info, Paperclip } from 'lucide-react';
import type { Complaint, DemoState } from '../types';
import { hasReached } from '../workflow';

export function StructuredCase({ complaint, state }: { complaint: Complaint; state: DemoState }) {
  const ready = hasReached(state, 'structured');
  const fields = [['Cliente', complaint.customer], ['Contact', complaint.contact], ['Commande', complaint.order], ['Produit', complaint.product], ['Problème', complaint.problem], ['Conséquence', complaint.consequence]];
  return <section className={`case-panel panel ${ready ? 'case-created' : ''}`} aria-labelledby="case-heading">
    <div className="panel-heading"><h2 id="case-heading"><FolderOpen size={17} aria-hidden="true" />Dossier structuré</h2><span className="eyebrow">02</span></div>
    {ready ? <div className="case-content reveal-from-mail">
      <div className="case-title"><div><span className="eyebrow">DOSSIER DE RÉCLAMATION</span><h3>{complaint.id}</h3></div><span className="urgent">{complaint.priority}</span></div>
      <dl className="case-fields">{fields.map(([label, value], index) => <div key={label} style={{ animationDelay: `${index * 75}ms` }}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="constraint"><Clock3 size={18} aria-hidden="true" /><div><span>Contrainte cliente</span><strong>{complaint.constraint}</strong></div></div>
      <div className="missing"><Info size={18} aria-hidden="true" /><div><strong>Une information à demander</strong><p>{complaint.missing}</p></div></div>
      <div className="case-foot"><Paperclip size={15} aria-hidden="true" /><span>Facture et 2 photos rattachées</span></div>
    </div> : <div className="case-empty">
      <div className="empty-paper" aria-hidden="true"><FolderOpen size={28} strokeWidth={1.3} /><span /><span /><span /></div>
      <h3>{state === 'extracting' ? 'Les informations prennent forme' : 'Le mail devient un dossier'}</h3>
      <p>Cliente, commande, problème et urgence réunis au même endroit.</p>
      <span className="empty-direction"><ArrowRight size={18} aria-hidden="true" />{state === 'extracting' ? 'Extraction en cours' : 'Prêt à recevoir les informations'}</span>
    </div>}
  </section>;
}
