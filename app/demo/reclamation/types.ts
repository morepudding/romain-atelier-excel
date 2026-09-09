export interface Attachment { name: string; kind: 'pdf' | 'image'; size: string }
export interface EmailSegment { text: string; highlight?: 'reference' | 'product' | 'problem' | 'deadline' }
export interface IncomingMail {
  sender: { name: string; role: string; company: string; address: string };
  subject: string; receivedAt: string; paragraphs: EmailSegment[][]; attachments: Attachment[];
}
export interface Complaint {
  id: string; customer: string; contact: string; order: string; product: string;
  problem: string; consequence: string; constraint: string; priority: 'Urgente'; missing: string;
}
export interface Procedure { id: string; title: string; source: string; excerpt: string }
export interface TeamMember {
  id: string; name: string; initials: string; role: string; activeCases: number;
  availability: string; availableNow: boolean;
}
export interface Assignment { ownerId: string; consultantId: string; deadline: string; rationale: string }
export interface Reply { recipient: string; subject: string; body: string }
export type DemoState = 'idle' | 'extracting' | 'structured' | 'procedure-found' | 'assigned' | 'reply-ready' | 'validated';
