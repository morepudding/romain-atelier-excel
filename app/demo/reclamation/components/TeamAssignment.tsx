import { Check, Users } from 'lucide-react';
import type { Assignment, TeamMember } from '../types';

export function TeamAssignment({ team, assignment }: { team: TeamMember[]; assignment: Assignment }) {
  return <section className="team-section reveal" aria-labelledby="team-heading">
    <div className="section-heading"><Users size={16} aria-hidden="true" /><h3 id="team-heading">La bonne personne</h3><strong className="deadline">Avant {assignment.deadline}</strong></div>
    <ul className="team-list">{team.map(member => <li key={member.id} className={member.id === assignment.ownerId ? 'selected-person' : ''}>
      <span className="team-avatar" aria-hidden="true">{member.initials}</span>
      <div className="person"><strong>{member.name}{member.id === assignment.ownerId && <Check size={14} aria-label="Responsable du dossier" />}</strong><span>{member.role}</span></div>
      <div className="workload"><span>{member.activeCases} dossiers actifs</span><small>{member.availability}</small></div>
    </li>)}</ul>
    <p className="assignment-reason">{assignment.rationale}</p>
  </section>;
}
