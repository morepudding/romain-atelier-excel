import { Inbox } from 'lucide-react';
import type { DemoState, IncomingMail } from '../types';
import { hasReached } from '../workflow';
import { AttachmentList } from './AttachmentList';

export function IncomingEmail({ email, state }: { email: IncomingMail; state: DemoState }) {
  return <section className={`email-panel panel ${state === 'extracting' ? 'is-extracting' : ''}`} aria-labelledby="email-heading">
    <div className="panel-heading"><h2 id="email-heading"><Inbox size={17} aria-hidden="true" />Mail entrant</h2><span className="eyebrow">01</span></div>
    <div className="email-content">
      <div className="sender"><span className="avatar">CM</span><div><strong>{email.sender.name}</strong><span>{email.sender.role} · {email.sender.company}</span></div><time>{email.receivedAt}</time></div>
      <div className="recipient">À : Service après-vente</div>
      <h3 className="email-subject">{email.subject}</h3>
      <div className="email-body">{email.paragraphs.map((segments, index) => <p key={index}>{segments.map((segment, part) => segment.highlight ? <mark key={part} data-highlight={segment.highlight}>{segment.text}</mark> : <span key={part}>{segment.text}</span>)}</p>)}</div>
      <AttachmentList attachments={email.attachments} attached={hasReached(state, 'structured')} />
    </div>
  </section>;
}
