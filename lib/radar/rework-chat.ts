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
  const stage = data.automation?.stage || 'research';
  let nextInstruction =
    'Commence maintenant par l’audit et la première direction de validation, puis arrête-toi.';
  if (stage === 'direction_review')
    nextInstruction =
      'La direction enregistrée attend ma validation. Présente-la clairement, demande si je la valide ou ce qui doit être corrigé, puis arrête-toi sans coder.';
  if (stage === 'opening_build')
    nextInstruction =
      'La direction a été validée. Construis uniquement le prototype d’ouverture prévu par le skill, présente-le, puis arrête-toi avant le reste du site.';
  if (stage === 'opening_review')
    nextInstruction =
      'Le prototype d’ouverture attend ma validation. Contrôle et présente le lien enregistré, demande ma décision, puis arrête-toi sans développer le site complet.';
  if (stage === 'production' || stage === 'quality_review')
    nextInstruction =
      'Les deux validations ont été données. Termine le site selon la direction et l’ouverture approuvées, exécute les contrôles puis livre seulement si toutes les portes passent.';
  if (stage === 'ready')
    nextInstruction =
      'Une proposition terminée existe déjà. Commence par la contrôler et traite uniquement la correction demandée ; ne repars pas de zéro.';

  return `Tu es dans un nouveau chat consacré à la préparation interne d’une refonte web.

ENTREPRISE
- Nom : ${value(data.name, 'Entreprise non renseignée')}
- Activité : ${sectors[data.sector]}
- Localisation : ${value(data.locality, 'Non renseignée')}
- URL du site : ${sources[0]}
- Source d’identité : ${sources[1]}
- SIREN : ${value(data.siren, 'Non renseigné')}

CONTEXTE DU RADAR
- Identifiant du dossier : ${project.id}
- Identifiant du propriétaire : ${project.user_id}
- Cette entreprise a été retenue dans Radar Rework après tri humain.
- Raison de la sélection : ${value(data.user_reason, 'À préciser à partir des observations ci-dessous.')}
- Angle à explorer : ${value(data.angle, 'À définir à partir de faits vérifiables.')}
- Observations et signaux : ${value(data.observations, 'Aucune observation détaillée enregistrée.')}
- État du site lors de l’observation : ${siteStates[data.site_state]}
- Captures : ${captures.length ? captures.join(' ') : 'Aucune capture privée transférée automatiquement.'}

ÉTAT DE PRODUCTION
- Étape : ${stage}
- Brief enregistré : ${value(data.brief, 'Aucun')}
- Direction enregistrée : ${value(data.direction_a, 'Aucune')}
- Prototype d’ouverture : ${value(data.automation?.prototype_url || '', 'Aucun')}
- Validation de la direction : ${value(data.automation?.direction_approved_at || '', 'Non donnée')}
- Validation de l’ouverture : ${value(data.automation?.opening_approved_at || '', 'Non donnée')}

SKILL ET WORKFLOW OBLIGATOIRES
- Utiliser explicitement le skill $rework-vitrine-signature. S’il n’est pas disponible, ne pas improviser un workflow de remplacement : signaler le blocage.
- Coif’Hommes est le plancher de finition technique à dépasser, jamais un style à recopier.
- Commencer par comprendre l’entreprise, ses contenus réels et l’action prioritaire du visiteur.
- Préparer une seule direction puis une seule maquette interactive très travaillée.
- Traiter le site existant comme une source documentaire et une matière de marque : ne pas recopier sa mise en page, mais ne jamais jeter son identité reconnaissable sans justification.
- Avant toute piste, établir une matrice « préserver / moderniser / abandonner » pour les couleurs, le mot-symbole, le ton typographique, les formes, les motifs et les signes physiques du lieu. La direction doit nommer au moins trois ancrages réellement conservés.
- Trier chaque image d’origine avant de l’utiliser : conserver seulement un visuel assez net, crédible et bien composé pour soutenir une vitrine exigeante. Une image authentique mais médiocre doit être refusée.
- Si aucune image réelle n’atteint ce niveau, construire une composition forte en HTML/CSS ou créer une illustration d’ambiance clairement signalée comme telle. Cette alternative doit dériver de la matrice de marque ; une belle image générique du secteur ou de la destination est un échec. Ne jamais inventer en photo réaliste la façade, les chambres, l’équipe ou les réalisations de l’entreprise.
- Écrire avant le code une thèse de design, l’effet recherché dans les trois premières secondes, une interaction signature liée au métier et les clichés visuels explicitement interdits.
- Si un logo ou mot-symbole exploitable existe, décrire précisément son apparition dans l’ouverture. Une promesse d’introduction de marque sans logo réellement visible est un échec.
- Exiger un premier écran immédiatement impressionnant, même sans interaction : composition identifiable, typographie assumée, contraste et action utile. Si le résultat ressemble à un gabarit auquel on pourrait substituer le logo d’un concurrent, le refaire.
- Une simple remise au propre du site actuel ne suffit pas. La proposition doit montrer un saut de perception évident tout en conservant uniquement des faits vérifiés.
- Une interaction signature enrichit la visite mais ne cache jamais l’offre, les tarifs, le contact ou l’action principale. Le visiteur doit comprendre et agir sans parcourir une série de gadgets.
- Contrôler le rendu réel sur ordinateur et mobile avant publication, côte à côte avec le site source. Sans le logo, le dirigeant doit encore pouvoir reconnaître son établissement dans les couleurs, le ton, les formes ou les signes du lieu. Refaire la direction si les captures restent sages, génériques, étrangères à la marque ou dominées par des ressources faibles.
- La vérification automatique et toute génération payante restent désactivées.
- Toute information non sourcée doit rester présentée comme une hypothèse à confirmer.

DEUX ARRÊTS HUMAINS OBLIGATOIRES
- Premier arrêt : après l’audit, présenter une direction unique avec la matrice de marque, le storyboard des trois premières secondes, l’apparition du logo, le premier écran, le parcours, l’interaction, la stratégie d’images et les améliorations techniques prévues face à Coif’Hommes. Ne coder aucun prototype dans ce même tour. Attendre ma validation explicite.
- Deuxième arrêt : après validation de la direction, coder et présenter uniquement l’ouverture, le premier écran, la première transition et l’interaction signature. Ne pas développer le reste du site dans ce même tour. Attendre ma deuxième validation explicite.
- Une autorisation ancienne, le lancement de ce chat ou une demande de correction ne remplace jamais l’accord donné après avoir vu l’étape courante.
- Le site complet, son rattachement final dans Radar et sa publication comme proposition terminée ne sont autorisés qu’après ces deux accords.

GARDE-FOU
- Tout reste strictement interne.
- Aucun prospect ne doit être contacté et aucun envoi commercial ne doit être préparé avant décembre 2026.
- Décembre 2026 ne constitue pas une autorisation automatique d’envoyer : toute prise de contact devra être confirmée séparément.

${nextInstruction}`;
}
