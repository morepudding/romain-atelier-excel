import type { Assignment, Complaint, IncomingMail, Procedure, Reply, TeamMember } from './types';

export const email: IncomingMail = {
  sender: { name: 'Claire Martin', role: 'Directrice achats', company: 'Atelier Horizon', address: 'claire.martin@atelier-horizon.example' },
  subject: 'Commande CMD-4587 — deux panneaux rayés à la réception',
  receivedAt: '12 h 00',
  paragraphs: [
    [{ text: 'Bonjour,' }],
    [{ text: 'Nous venons de réceptionner la commande ' }, { text: 'CMD-4587', highlight: 'reference' }, { text: '. ' }, { text: 'Deux panneaux aluminium AL-220', highlight: 'product' }, { text: ' sont ' }, { text: 'rayés et inutilisables', highlight: 'problem' }, { text: '. Notre ' }, { text: 'chantier démarre demain matin', highlight: 'deadline' }, { text: '.' }],
    [{ text: 'Vous trouverez la facture et les photos en pièces jointes. Pouvez-vous nous ' }, { text: 'confirmer aujourd’hui la solution proposée', highlight: 'deadline' }, { text: ' ?' }],
    [{ text: 'Merci,\nClaire Martin' }],
  ],
  attachments: [
    { name: 'facture-CMD-4587.pdf', kind: 'pdf', size: '184 Ko' },
    { name: 'photo-panneau-1.jpg', kind: 'image', size: '1,2 Mo' },
    { name: 'photo-panneau-2.jpg', kind: 'image', size: '980 Ko' },
  ],
};
export const complaint: Complaint = {
  id: 'SAV-4587', customer: 'Atelier Horizon', contact: 'Claire Martin', order: 'CMD-4587',
  product: 'Deux panneaux aluminium AL-220', problem: 'Rayures constatées à la réception',
  consequence: 'Produits inutilisables', constraint: 'Chantier prévu demain matin',
  priority: 'Urgente', missing: 'Numéro de lot visible sur l’étiquette',
};
export const procedure: Procedure = {
  id: 'PROC-SAV-07', title: 'Produit endommagé à la réception', source: 'Procédure SAV, section 3.2',
  excerpt: 'Lorsque le défaut empêche l’utilisation du produit et qu’une preuve photographique est disponible, ouvrir un dossier prioritaire, vérifier le numéro de lot et confirmer la solution proposée sous quatre heures ouvrées.',
};
export const team: TeamMember[] = [
  { id: 'sophie', name: 'Sophie Bernard', initials: 'SB', role: 'Responsable SAV', activeCases: 2, availability: 'Disponible', availableNow: true },
  { id: 'lucas', name: 'Lucas Moreau', initials: 'LM', role: 'Responsable qualité', activeCases: 8, availability: 'Fortement sollicité', availableNow: false },
  { id: 'amine', name: 'Amine Diallo', initials: 'AD', role: 'Administration des ventes', activeCases: 5, availability: 'Disponible cet après-midi', availableNow: false },
];
export const assignment: Assignment = {
  ownerId: 'sophie', consultantId: 'lucas', deadline: '16 h',
  rationale: 'Compétence SAV, disponible, charge la plus faible',
};
export const reply: Reply = {
  recipient: 'Claire Martin', subject: 'RE : ' + email.subject,
  body: 'Bonjour Madame Martin,\n\nNous avons enregistré la non-conformité concernant les deux panneaux AL-220 de la commande CMD-4587 et avons classé votre demande comme prioritaire.\n\nLes photos et la facture ont bien été rattachées au dossier. Afin de confirmer la solution de remplacement, pourriez-vous nous transmettre le numéro de lot visible sur l’étiquette des panneaux ?\n\nSophie Bernard, responsable SAV, revient vers vous avant 16 h avec la solution proposée.\n\nBien cordialement',
};
