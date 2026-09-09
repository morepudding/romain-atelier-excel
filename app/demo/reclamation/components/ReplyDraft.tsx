import { MailCheck } from 'lucide-react';
import type { Reply } from '../types';

interface Props { reply: Reply; value: string; editing: boolean; validated: boolean; onChange: (value: string) => void }
export function ReplyDraft({ reply, value, editing, validated, onChange }: Props) {
  return <section className="reply-section reveal" aria-labelledby="reply-heading">
    <div className="section-heading"><MailCheck size={16} aria-hidden="true" /><h3 id="reply-heading">La réponse préparée</h3><span>{validated ? 'Validée' : 'À valider'}</span></div>
    <div className="reply-to">À : {reply.recipient}<span>Brouillon · aucun envoi</span></div>
    {editing ? <div className="reply-editor"><label htmlFor="reply-body" className="sr-only">Modifier la réponse à Claire Martin</label><textarea id="reply-body" value={value} onChange={event => onChange(event.target.value)} /><span className="editor-note">Modifications locales · validez lorsque le texte vous convient.</span></div> : <div className="reply-body">{value.split('\n\n').map((paragraph, i) => <p key={i}>{paragraph}</p>)}</div>}
  </section>;
}
