import { FileText, Image, Paperclip } from 'lucide-react';
import type { Attachment } from '../types';

export function AttachmentList({ attachments, attached }: { attachments: Attachment[]; attached: boolean }) {
  return <div className="attachments">
    <div className="attachment-heading"><Paperclip size={14} aria-hidden="true" /> <span>3 pièces jointes</span><span className="attachment-state">{attached ? 'Rattachées au dossier' : 'Reçues avec le mail'}</span></div>
    <ul>{attachments.map(file => <li key={file.name}>
      {file.kind === 'pdf' ? <FileText size={20} aria-hidden="true" className="pdf-icon" /> : <Image size={20} aria-hidden="true" />}
      <span>{file.name}</span><small>{file.size}</small>
    </li>)}</ul>
  </div>;
}
