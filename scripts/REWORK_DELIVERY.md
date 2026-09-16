# Workflow de livraison : une maquette interactive sur demande

Validé par Romain le 14 septembre 2026 après le pilote Coif’Hommes : https://coif-hommes-experience.vercel.app/. Le résultat attendu est une seule maquette codée, vivante, adaptée au métier, consultable sur Vercel sans compte ChatGPT, puis rattachée au dossier privé Radar. Coif’Hommes est une référence de qualité, pas un gabarit à recolorer.

## Déclenchement et décisions humaines

« Oui, à refaire » enregistre uniquement `decision=retained`. Le tri ne met plus aucun dossier en file et ne déclenche aucune génération. « Lancer la refonte » prépare un nouveau chat ChatGPT en copiant un prompt structuré ; la plateforme ne fournit pas de création de chat fiable depuis l’application web, et l’utilisateur doit donc piloter explicitement la suite. Une demande de correction produit une nouvelle série avec sa consigne et conserve les versions précédentes. Le bureau n’appelle plus le générateur d’images par API.

Les séries déjà explicitement engagées dans l’ancien workflow restent conservées pour consultation et reprise contrôlée. Cette refonte n’en crée aucune nouvelle. Les tâches de découverte restent séparées.

Les dossiers anciens A/B restent consultables. Ne pas les régénérer automatiquement et ne pas transformer un ancien statut retained en nouvelle file. Ne jamais choisir la maquette, écarter un dossier ou contacter une entreprise à la place de Romain.

## Accès et périmètre

Lire la version courante de `AGENTS.md`, `CURRENT_STATE.md`, ce protocole et `scripts/rework-interactive.py` dans le dépôt autorisé. Le propriétaire et le projet Supabase sont donnés par la tâche, pas intégrés aux sources publiques. Vérifier l’appartenance à `radar_members`. Toutes les opérations métier sont filtrées par propriétaire et dossier ; les triggers gèrent révisions et historique.

Utiliser les capacités incluses de ChatGPT et les connecteurs autorisés. Ne pas appeler `/api/radar/rework/prepare`, une API d’IA payante ou Vercel AI Gateway ; ne pas acheter de crédits, abonnement ni changer la facturation. Ne pas ajouter de worker IA payant pour obtenir un départ instantané. Aucun sous-agent. Pas de modification du schéma, des droits, de l’authentification, des tâches de découverte ni du code applicatif par le worker de maquettes.

## Réserver et reprendre

Exécuter les SQL générés par ce script avec le connecteur Supabase autorisé. Le script ne contacte aucun service.

```sh
python scripts/rework-interactive.py claim --owner UUID --output /tmp/rework-claim.sql
```

La réservation atomique traite uniquement les validations explicites `interactive-v1`, ignore les choix humains et les livraisons complètes, respecte les erreurs et empêche deux exécutions actives pour ce propriétaire. Elle retourne le dossier, sa nouvelle révision et un bail de 90 minutes. Si aucun dossier n’est retourné, terminer sans notification. Après trois interruptions non résolues, le dossier passe en erreur ; une action « Reprendre la création » permet une nouvelle tentative.

Lire le dossier retourné, sa consigne, ses sources et `automation.artifact_path`. Le chemin réservé est `public/maquettes/<UUID-dossier>/v<N>`. Il reste identique lors des reprises ; une correction crée un autre chemin. Avant de recréer quoi que ce soit, chercher ce dossier dans GitHub et relire `source_commit`, `deployment_id`, `deployment_url` et `context`. Si les sources ou le déploiement existent déjà, reprendre le contrôle ou le rattachement manquant.

Faire un checkpoint après le brief, la sauvegarde Git et le déploiement, et avant l’expiration du bail :

```sh
python scripts/rework-interactive.py checkpoint --owner UUID --project UUID --revision N --lease UUID --metadata /tmp/rework-progress.json --output /tmp/rework-checkpoint.sql
```

Le JSON accepte `brief`, `direction_a` (12 000 caractères chacun) ; `context` (14 000 caractères : sources, inconnues, étapes et contrôles privés) ; `source_commit` (SHA complet) ; `deployment_id` ; `deployment_url` (HTTPS Vercel, sans identifiants). Chaque écriture renouvelle le bail et retourne une nouvelle révision : utiliser cette révision pour la suite. Toute révision concurrente ou perte du bail impose une relecture. Ne pas forcer l’import, renouveler un bail expiré ou écraser la décision humaine. Relire décision et bail juste avant une publication externe ; si un changement intervient pendant la publication, ne pas rattacher le résultat au dossier.

## Direction artistique et séquence d’ouverture

Consulter les skills de conception et de navigateur applicables. Examiner le site existant, ses photos et sa présence publique ; vérifier l’identité, l’offre et le contact. Les observations, sources, dates, avis et inconnues restent dans Radar, jamais dans le code public. Ne pas inventer avis, chiffres, horaires, prix, labels, équipe ou prestations. Exploiter les vraies photos utilisables ; identifier clairement les images d’inspiration sans les faire passer pour des réalisations du commerce.

Le site existant sert de source documentaire, pas de moodboard obligatoire. Avant le brief, classer chaque visuel public en trois catégories : utilisable tel quel, récupérable après recadrage ou correction légère, ou à refuser. Une photo authentique mais trop petite, datée, mal cadrée ou visuellement faible ne doit pas être reprise simplement parce qu’elle existe. La qualité de la proposition ne doit jamais être plafonnée par les ressources du site actuel.

S’il n’existe aucun visuel réel assez fort, choisir explicitement une autre stratégie : composition typographique et graphique produite en HTML/CSS, matière ou illustration abstraite, ou illustration générée clairement présentée comme visuel d’ambiance. Une illustration peut évoquer un lieu ou un métier ; elle ne doit jamais fabriquer une fausse façade, une fausse chambre, une fausse équipe ou une fausse réalisation et la présenter comme réelle.

Avant de coder, choisir une idée directrice liée au métier et décrire dans le brief ce que le visiteur voit et peut faire dès les premières secondes : image ou composition forte, typographie assumée, message court, action utile. Choisir une interaction signature et une ou deux séquences de défilement pertinentes. Par exemple, un geste de coupe pour un coiffeur, une découverte de matière pour un artisan, un jeu de reflets pour un bijoutier. Les ciseaux, le citron/noir et les cartes du pilote ne sont pas des éléments obligatoires.

La thèse de design doit également nommer les clichés refusés pour ce projet. « Moderne », « premium » ou « élégant » ne sont pas des directions artistiques. Pour un hôtel, éviter par défaut le template beige et doré, les cartes de services automatiques et les photographies génériques de chambre. Pour tout secteur, refuser la composition qui pourrait accueillir le logo de n’importe quel concurrent sans modification structurelle.

L’ouverture doit déjà être visuellement aboutie avant toute interaction. Si un chargement réel le justifie, prévoir une entrée très courte adaptée au métier, sans fausse attente ni jeu bloquant. L’accès au contenu et au contact reste immédiat. Une scène épinglée peut faire apparaître des cartes au défilement ; un tracé peut progresser et conduire à un média qui s’agrandit. Sélectionner ces effets pour raconter le métier, sans les empiler systématiquement.

Appliquer un test des trois premières secondes avant de poursuivre : sans explication et sans déclencher l’interaction, le premier écran doit donner une perception nette du métier, porter une composition mémorable et montrer une action réelle. Si le résultat est seulement plus propre que l’ancien site, trop sage ou dépend d’une image faible, reprendre la direction avant de construire les sections suivantes.

Préserver le défilement naturel, le clavier, les liens et les zones cliquables. Le curseur thématique reste limité à une scène appropriée et dispose d’un équivalent tactile. Respecter `prefers-reduced-motion` : toutes les informations restent visibles sans animation, ni écran de chargement bloquant. Utiliser une image pertinente si aucune vraie vidéo n’existe. Aucune fausse réservation ou formulaire qui prétend envoyer une demande.

## Construction et publication

Construire une page autonome HTML/CSS/JS avec ressources locales et chemins relatifs dans le dossier réservé. La page doit rester lisible si le JS échoue. Images optimisées, polices locales lorsque possible, pas de CDN obligatoire ni dépendance inutile. Ajouter `noindex,nofollow` aux maquettes de prospection. Ne pas publier de notes commerciales, prompts, captures du Radar, SQL, secrets ou données privées dans GitHub. Seuls les fichiers publics destinés à être vus par le prospect vont sous `public/maquettes/`.

Contrôler le résultat au navigateur : première vue ordinateur et mobile, parcours complet au défilement, interaction signature, clavier, CTA/contact, médias chargés, absence de débordement et mode mouvement réduit. Corriger les problèmes réellement constatés. Ne pas livrer une page statique médiocre simplement parce que le script fonctionne. Conserver une capture d’accueil utilisable pour l’aperçu et un compte rendu honnête des contrôles dans le dossier privé.

La revue visuelle est une porte de sortie, pas une formalité. Examiner les captures ordinateur et mobile face à la thèse de design, puis vérifier quatre points : saut de perception évident par rapport à l’existant, singularité liée au métier, qualité suffisante de chaque asset visible et force du premier écran sans animation. Un seul échec impose une correction avant publication.

Publier uniquement le dossier de cette série sur `main` de `morepudding/romain-atelier-excel`, avec l’autorisation permanente donnée par Romain pour ce workflow. Utiliser un commit normal, jamais force-push ; relire la branche et résoudre toute concurrence. Les connecteurs GitHub natifs peuvent créer blobs, arbre et commit puis avancer la référence sans forçage si Git CLI n’est pas authentifié. Ne pas remplacer le reste du dépôt et ne pas modifier les anciennes versions des maquettes.

La publication du dépôt déclenche le projet Vercel Radar existant. Attendre un déploiement de production READY contenant ce commit ; un statut BUILDING n’est pas une livraison. Ne pas créer de nouveau projet Vercel par défaut. Le lien public, stable pour cette version, est :

`https://romain-atelier-excel.vercel.app/maquettes/<UUID-dossier>/v<N>/index.html`

Vérifier ce lien sans session ChatGPT ou Radar, y compris les ressources relatives et interactions après déploiement. Enregistrer le SHA Git, l’identifiant du déploiement et son URL dans le checkpoint. Si une reprise trouve déjà le bon commit déployé, ne pas republier inutilement. L’ancien lien reste fonctionnel lors des corrections car chaque série a son propre répertoire.

## Rattachement obligatoire dans Radar

Créer un aperçu HTML/CSS autonome privé avec une capture fidèle ou une version statique lisible de l’accueil. Intégrer styles et images data:, maximum 8 Mo. L’aperçu ne dépend d’aucun script ou réseau. Ne pas affaiblir la sandbox ou la CSP des iframes Radar pour faire fonctionner les animations : celles-ci sont accessibles via le lien Vercel public.

Après contrôle du lien et checkpoint, importer l’aperçu et le lien ensemble :

```sh
python scripts/rework-interactive.py complete --owner UUID --project UUID --revision N --lease UUID --preview /tmp/preview.html --url https://romain-atelier-excel.vercel.app/maquettes/UUID/vN/index.html --output /tmp/rework-complete.sql
```

La transaction vérifie propriétaire, appartenance, décision, révision, bail et chemin réservé. Elle insère l’aperçu immuable dédupliqué SHA-256 et met à jour `presentation=single`, `interactive_url`, `pages.a`, `pages.b=''`, `automation.status=ready`. Elle préserve les raisons de Romain, les observations, les anciennes pages et l’historique. Un seul lien ou brief ne vaut pas livraison.

Relire les références, le propriétaire/dossier/slot, le SHA recalculé depuis le HTML, la nouvelle version et l’absence de choix automatique. Vérifier l’interface connectée si une session est disponible ; sans session, contrôler les données et le site public et signaler précisément cette limite. Ne pas contourner la connexion.

En cas de blocage réel, conserver les sources et checkpoints, puis exécuter `fail` avec les mêmes gardes et `--error` (500 caractères maximum). Garder une erreur courte sans secrets. Aucun achat ni tentative en boucle. Un conflit humain n’est pas une erreur à écrire de force.

## Livraison à Romain

Notifier uniquement une maquette réellement livrée ou un blocage nécessitant son intervention. Répondre en français, sans liste à puces, avec le lien Radar et le lien public, le concept en une phrase et les contrôles/limites utiles. Le parcours devient : retenir l’entreprise, ouvrir la maquette, la valider ou demander une correction. La diffusion à l’entreprise attend une autorisation distincte ; aucun message automatique.

Le script historique `rework-import-pages.py` reste disponible pour les imports A/B anciens, mais n’est plus le protocole de création courante.
