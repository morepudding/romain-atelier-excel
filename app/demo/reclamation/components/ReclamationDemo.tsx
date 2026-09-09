'use client';

import Link from 'next/link';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleCheck, FileText, LoaderCircle, Pencil, RotateCcw, ShieldCheck } from 'lucide-react';
import { assignment, complaint, email, procedure, reply, team } from '../demo-data';
import { hasReached, isRunning, statusText } from '../workflow';
import { useDemoWorkflow } from '../use-demo-workflow';
import { IncomingEmail } from './IncomingEmail';
import { StructuredCase } from './StructuredCase';
import { ProcedureEvidence } from './ProcedureEvidence';
import { TeamAssignment } from './TeamAssignment';
import { ReplyDraft } from './ReplyDraft';
import { WorkflowProgress } from './WorkflowProgress';

export function ReclamationDemo() {
  const { state, run, start, validate, revise } = useDemoWorkflow();
  const [draft, setDraft] = useState(reply.body);
  const [editing, setEditing] = useState(false);
  const validateButton = useRef<HTMLButtonElement>(null);
  const started = useRef(false);
  const ready = hasReached(state, 'reply-ready');
  const busy = isRunning(state);
  useEffect(() => {
    if (state === 'reply-ready' && started.current) validateButton.current?.focus({ preventScroll: true });
  }, [state]);
  useEffect(() => {
    if (editing) document.getElementById('reply-body')?.focus({ preventScroll: true });
  }, [editing]);
  function replay() {
    setEditing(false); setDraft(reply.body); started.current = true; start();
  }
  return <div className="reclamation-demo demo-app" data-state={state}>
    <header className="topbar"><div className="brand"><Link className="back-to-cockpit" href="/">← Retour au cockpit</Link><span className="brand-divider" /><strong>Matière</strong><span>Bureau SAV</span></div><span className="demo-label">Démonstration — entreprise et données fictives</span></header>
    <main>
      <div className="intro"><div><h1>Une réclamation arrive. <span>Le dossier est déjà prêt.</span></h1><p>Du mail brut à la réponse prête à valider.</p></div><span className="scenario-reference">CMD-4587</span></div>
      <WorkflowProgress state={state} />
      <div className="workspace" key={run}>
        <IncomingEmail email={email} state={state} />
        <StructuredCase complaint={complaint} state={state} />
        <section className="decision-panel panel" aria-labelledby="decision-heading">
          <div className="panel-heading"><h2 id="decision-heading"><ShieldCheck size={17} aria-hidden="true" />Prêt pour la décision</h2><span className="eyebrow">03</span></div>
          {hasReached(state, 'procedure-found') ? <div className="decisions">
            <ProcedureEvidence procedure={procedure} />
            {hasReached(state, 'assigned') && <TeamAssignment team={team} assignment={assignment} />}
            {ready && <ReplyDraft reply={reply} value={draft} editing={editing} validated={state === 'validated'} onChange={setDraft} />}
          </div> : <div className="decision-empty"><span className="empty-rule" /><h3>Une décision étayée.</h3><p>La procédure à appliquer.<br />Le responsable disponible.<br />La réponse à valider.</p><span className="empty-rule" /></div>}
          {hasReached(state, 'procedure-found') && !ready && <div className="decision-wait"><LoaderCircle size={16} className="spin" aria-hidden="true" />{state === 'assigned' ? 'Rédaction de la réponse…' : 'Comparaison des rôles et des disponibilités…'}</div>}
        </section>
      </div>
      <footer className={`actionbar ${ready ? 'is-ready' : ''} ${state === 'validated' ? 'is-validated' : ''}`}>
        <div className="status"><span className="status-icon">{ready ? <CircleCheck size={23} aria-hidden="true" /> : busy ? <LoaderCircle size={23} className="spin" aria-hidden="true" /> : <FileText size={23} aria-hidden="true" />}</span><div><output aria-live="polite" aria-atomic="true">{statusText[state]}</output><span>{ready ? state === 'validated' ? 'Validation enregistrée pour cette démonstration.' : 'Sophie Bernard · Responsable du dossier · Réponse attendue avant 16 h' : busy ? 'Le dossier se prépare sous vos yeux.' : 'Commande CMD-4587 · Atelier Horizon'}</span></div></div>
        <div className="actions">{ready ? <>
          <button className="primary" ref={validateButton} disabled={state === 'validated' || !draft.trim()} onClick={() => { setEditing(false); validate(); }}><Check size={17} aria-hidden="true" />{state === 'validated' ? 'Réponse validée' : 'Valider la réponse'}</button>
          <button className="secondary" onClick={() => { if (!editing) revise(); setEditing(value => !value); }} aria-pressed={editing}><Pencil size={16} aria-hidden="true" />Modifier</button>
          <button className="text-button" onClick={replay}><RotateCcw size={16} aria-hidden="true" />Rejouer la démonstration</button>
        </> : <button className="primary start-button" disabled={busy} onClick={replay}>{busy ? 'Traitement en cours' : 'Traiter la réclamation'}<ArrowRight size={18} aria-hidden="true" /></button>}</div>
      </footer>
    </main>
  </div>;
}
