import { sectors, siteStates, type ReworkProject } from './rework.ts';

const value = (input: string, fallback: string) => input.trim() || fallback;

export function reworkChatPrompt(project: ReworkProject) {
  const data = project.data;
  const sources = [
    value(data.website, 'Non renseigné'),
    value(data.source_url, 'Aucune source annuaire enregistrée'),
  ];
  const captures = [
    data.images.before ? 'Capture du site actuel disponible dans Radar.' : '',
    data.pages.a || data.pages.b || data.interactive_url
      ? 'Une ancienne proposition ou maquette est consultable dans le dossier Radar.'
      : '',
  ].filter(Boolean);

  return `Tu es dans un nouveau chat consacré à la préparation interne d’une refonte web.

ENTREPRISE
- Nom : ${value(data.name, 'Entreprise non renseignée')}
- Activité : ${sectors[data.sector]}
- Localisation : ${value(data.locality, 'Non renseignée')}
- URL du site : ${sources[0]}
- Source d’identité : ${sources[1]}
- SIREN : ${value(data.siren, 'Non renseigné')}

CONTEXTE DU RADAR
- Cette entreprise a été retenue dans Radar Rework après tri humain.
- Raison de la sélection : ${value(data.user_reason, 'À préciser à partir des observations ci-dessous.')}
- Angle à explorer : ${value(data.angle, 'À définir à partir de faits vérifiables.')}
- Observations et signaux : ${value(data.observations, 'Aucune observation détaillée enregistrée.')}
- État du site lors de l’observation : ${siteStates[data.site_state]}
- Captures : ${captures.length ? captures.join(' ') : 'Aucune capture privée transférée automatiquement.'}

WORKFLOW VALIDÉ
- Commencer par comprendre l’entreprise, ses contenus réels et l’action prioritaire du visiteur.
- Préparer une seule maquette interactive très travaillée, dans l’esprit du niveau validé après Coif’Hommes.
- La maquette ne doit être créée que lorsque je le demande explicitement dans ce chat.
- La vérification automatique et toute génération payante restent désactivées.
- Toute information non sourcée doit rester présentée comme une hypothèse à confirmer.

GARDE-FOU
- Tout reste strictement interne.
- Aucun prospect ne doit être contacté et aucun envoi commercial ne doit être préparé avant décembre 2026.
- Décembre 2026 ne constitue pas une autorisation automatique d’envoyer : toute prise de contact devra être confirmée séparément.

Commence par reformuler brièvement les faits disponibles, les inconnues et les questions utiles avant de proposer quoi que ce soit.`;
}
