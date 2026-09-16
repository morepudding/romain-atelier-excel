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
- Traiter le site existant comme une source documentaire et une matière de marque : ne pas recopier sa mise en page, mais ne jamais jeter son identité reconnaissable sans justification.
- Avant toute piste, établir une matrice « préserver / moderniser / abandonner » pour les couleurs, le mot-symbole, le ton typographique, les formes, les motifs et les signes physiques du lieu. La direction doit nommer au moins trois ancrages réellement conservés.
- Trier chaque image d’origine avant de l’utiliser : conserver seulement un visuel assez net, crédible et bien composé pour soutenir une vitrine exigeante. Une image authentique mais médiocre doit être refusée.
- Si aucune image réelle n’atteint ce niveau, construire une composition forte en HTML/CSS ou créer une illustration d’ambiance clairement signalée comme telle. Cette alternative doit dériver de la matrice de marque ; une belle image générique du secteur ou de la destination est un échec. Ne jamais inventer en photo réaliste la façade, les chambres, l’équipe ou les réalisations de l’entreprise.
- Écrire avant le code une thèse de design, l’effet recherché dans les trois premières secondes, une interaction signature liée au métier et les clichés visuels explicitement interdits.
- Exiger un premier écran immédiatement impressionnant, même sans interaction : composition identifiable, typographie assumée, contraste et action utile. Si le résultat ressemble à un gabarit auquel on pourrait substituer le logo d’un concurrent, le refaire.
- Une simple remise au propre du site actuel ne suffit pas. La proposition doit montrer un saut de perception évident tout en conservant uniquement des faits vérifiés.
- Contrôler le rendu réel sur ordinateur et mobile avant publication, côte à côte avec le site source. Sans le logo, le dirigeant doit encore pouvoir reconnaître son établissement dans les couleurs, le ton, les formes ou les signes du lieu. Refaire la direction si les captures restent sages, génériques, étrangères à la marque ou dominées par des ressources faibles.
- La maquette ne doit être créée que lorsque je le demande explicitement dans ce chat.
- La vérification automatique et toute génération payante restent désactivées.
- Toute information non sourcée doit rester présentée comme une hypothèse à confirmer.

GARDE-FOU
- Tout reste strictement interne.
- Aucun prospect ne doit être contacté et aucun envoi commercial ne doit être préparé avant décembre 2026.
- Décembre 2026 ne constitue pas une autorisation automatique d’envoyer : toute prise de contact devra être confirmée séparément.

Commence par reformuler brièvement les faits disponibles, les inconnues et les questions utiles avant de proposer quoi que ce soit.`;
}
