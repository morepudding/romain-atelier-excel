# Workflow de livraison : vitrine signature avec deux validations

Le workflow officiel utilise le skill personnel `$rework-vitrine-signature`. Le résultat attendu est une seule maquette codée, vivante, adaptée au métier, consultable sur Vercel sans compte ChatGPT, puis rattachée au dossier privé Radar. Coif’Hommes est le plancher de finition technique à dépasser, pas un gabarit à recolorer.

Deux validations sont obligatoires : la direction artistique avant tout code, puis le prototype d’ouverture avant le site complet. Une autorisation générale, le lancement du chat ou une correction ne remplace jamais l’accord donné après présentation de l’étape courante.

## Déclenchement et décisions humaines

« Oui, à refaire » enregistre uniquement `decision=retained`. Le tri ne met plus aucun dossier en file et ne déclenche aucune génération. « Lancer la refonte » prépare un nouveau chat ChatGPT en copiant un prompt structuré qui invoque `$rework-vitrine-signature`, transmet les identifiants du dossier et reprend l’étape enregistrée. Une demande de correction produit une nouvelle série `signature-v1` avec sa consigne et conserve les versions précédentes. Le bureau n’appelle plus le générateur d’images par API.

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

La réservation atomique traite les séries `signature-v1` et reprend les anciennes séries `interactive-v1` en les faisant entrer dans le nouveau protocole. Elle ignore les choix humains et les livraisons complètes, respecte les attentes de validation et empêche deux exécutions actives pour ce propriétaire. Elle retourne le dossier, sa nouvelle révision et un bail de 90 minutes. Si aucun dossier n’est retourné, terminer sans notification. Après six reprises interrompues, le dossier passe en erreur.

Lire le dossier retourné, sa consigne, ses sources et `automation.artifact_path`. Le chemin réservé est `public/maquettes/<UUID-dossier>/v<N>`. Il reste identique lors des reprises ; une correction crée un autre chemin. Avant de recréer quoi que ce soit, chercher ce dossier dans GitHub et relire `source_commit`, `deployment_id`, `deployment_url` et `context`. Si les sources ou le déploiement existent déjà, reprendre le contrôle ou le rattachement manquant.

Faire un checkpoint après le brief, la sauvegarde Git et le déploiement, et avant l’expiration du bail :

```sh
python scripts/rework-interactive.py checkpoint --owner UUID --project UUID --revision N --lease UUID --metadata /tmp/rework-progress.json --output /tmp/rework-checkpoint.sql
```

Le JSON accepte `brief`, `direction_a` (12 000 caractères chacun) ; `context` (14 000 caractères : sources, inconnues, étapes et contrôles privés) ; `source_commit` (SHA complet) ; `deployment_id` ; `deployment_url` et `prototype_url` (HTTPS Vercel, sans identifiants). Chaque écriture retourne une nouvelle révision. Toute révision concurrente impose une relecture. Ne pas forcer l’import, renouveler un bail expiré ou écraser la décision humaine.

## Première validation : direction artistique

Après l’audit, produire le livrable de direction défini par `$rework-vitrine-signature`, sans écrire le prototype. Enregistrer le brief et la direction puis libérer le bail :

```sh
python scripts/rework-interactive.py await-direction --owner UUID --project UUID --revision N --lease UUID --metadata /tmp/rework-direction.json --output /tmp/rework-await-direction.sql
```

L’état devient `awaiting_direction / direction_review`. Présenter la direction à Romain et terminer le tour. Après un accord explicite donné sur cette direction, enregistrer l’approbation sans réutiliser un ancien bail :

```sh
python scripts/rework-interactive.py approve-direction --owner UUID --project UUID --revision N --output /tmp/rework-approve-direction.sql
```

Cette action date l’accord, place l’étape en `opening_build` et remet le dossier en file. Réserver à nouveau avant de coder.

## Deuxième validation : prototype d’ouverture

Construire uniquement l’introduction de marque, le premier écran, la première transition et l’interaction signature. Le prototype public se trouve sous `public/maquettes/<UUID>/v<N>/prototype/` ; il reste `noindex,nofollow` et ne vaut pas livraison finale.

Après déploiement READY et contrôle navigateur, enregistrer `prototype_url`, le commit et la preuve de déploiement puis libérer le bail :

```sh
python scripts/rework-interactive.py await-opening --owner UUID --project UUID --revision N --lease UUID --metadata /tmp/rework-opening.json --output /tmp/rework-await-opening.sql
```

L’état devient `awaiting_opening / opening_review`. Présenter le prototype à Romain et terminer le tour. Après son accord explicite :

```sh
python scripts/rework-interactive.py approve-opening --owner UUID --project UUID --revision N --output /tmp/rework-approve-opening.sql
```

Cette action date le second accord, place l’étape en `production` et remet le dossier en file. Réserver une troisième fois pour produire le site complet. La livraison finale est techniquement refusée si l’un des deux accords manque.

## Direction artistique et séquence d’ouverture

Consulter les skills de conception et de navigateur applicables. Examiner le site existant, ses photos et sa présence publique ; vérifier l’identité, l’offre et le contact. Les observations, sources, dates, avis et inconnues restent dans Radar, jamais dans le code public. Ne pas inventer avis, chiffres, horaires, prix, labels, équipe ou prestations. Exploiter les vraies photos utilisables ; identifier clairement les images d’inspiration sans les faire passer pour des réalisations du commerce.

Le site existant sert de source documentaire et de matière de marque, pas de mise en page à recopier. Avant le brief, produire une matrice courte « préserver / moderniser / abandonner » pour les couleurs, le mot-symbole ou logo, le ton typographique, les formes, les motifs, les éléments architecturaux et les autres signes physiques du lieu. Distinguer clairement une ressource faible d’un code identitaire : refuser une mauvaise photo n’autorise pas à effacer la palette, le caractère ou les repères reconnaissables de l’entreprise. Toute rupture avec un ancrage fort doit être expliquée.

Classer ensuite chaque visuel public en trois catégories : utilisable tel quel, récupérable après recadrage ou correction légère, ou à refuser. Une photo authentique mais trop petite, datée, mal cadrée ou visuellement faible ne doit pas être reprise simplement parce qu’elle existe. La qualité de la proposition ne doit jamais être plafonnée par les ressources du site actuel.

S’il n’existe aucun visuel réel assez fort, choisir explicitement une autre stratégie : composition typographique et graphique produite en HTML/CSS, matière ou illustration abstraite, ou illustration générée clairement présentée comme visuel d’ambiance. Cette stratégie doit reprendre au moins trois ancrages de la matrice de marque. Une belle image interchangeable du secteur ou de la destination est insuffisante. Une illustration peut évoquer un lieu ou un métier ; elle ne doit jamais fabriquer une fausse façade, une fausse chambre, une fausse équipe ou une fausse réalisation et la présenter comme réelle.

Avant de coder, choisir une idée directrice liée au métier et décrire dans le brief ce que le visiteur voit et peut faire dès les premières secondes : apparition réelle du logo ou mot-symbole, composition forte, typographie assumée, message court et action utile. Choisir une interaction signature et une ou deux séquences de défilement pertinentes. Une interaction enrichit la visite mais ne retient jamais l’offre, les prix, les coordonnées ou l’action principale. Le visiteur doit comprendre et agir sans parcourir une série de gadgets.

La thèse de design doit nommer les ancrages de marque conservés, leur transformation et les clichés refusés pour ce projet. « Moderne », « premium » ou « élégant » ne sont pas des directions artistiques. Pour un hôtel, éviter par défaut le template beige et doré, les cartes de services automatiques et les photographies génériques de chambre. Pour tout secteur, refuser la composition qui pourrait accueillir le logo de n’importe quel concurrent sans modification structurelle.

L’ouverture doit déjà être visuellement aboutie avant toute interaction. Si un chargement réel le justifie, prévoir une entrée très courte adaptée au métier, sans fausse attente ni jeu bloquant. L’accès au contenu et au contact reste immédiat. Une scène épinglée peut faire apparaître des cartes au défilement ; un tracé peut progresser et conduire à un média qui s’agrandit. Sélectionner ces effets pour raconter le métier, sans les empiler systématiquement.

Appliquer un test des trois premières secondes avant de poursuivre : sans explication et sans déclencher l’interaction, le premier écran doit donner une perception nette du métier, porter une composition mémorable et montrer une action réelle. Si le résultat est seulement plus propre que l’ancien site, trop sage ou dépend d’une image faible, reprendre la direction avant de construire les sections suivantes.

Préserver le défilement naturel, le clavier, les liens et les zones cliquables. Le curseur thématique reste limité à une scène appropriée et dispose d’un équivalent tactile. Respecter `prefers-reduced-motion` : toutes les informations restent visibles sans animation, ni écran de chargement bloquant. Utiliser une image pertinente si aucune vraie vidéo n’existe. Aucune fausse réservation ou formulaire qui prétend envoyer une demande.

## Construction complète et publication

Cette section ne s’exécute qu’après `direction_approved_at` et `opening_approved_at`. Conserver l’ouverture approuvée ; ne pas la remplacer silencieusement par une autre idée pendant la production.

Construire une page autonome HTML/CSS/JS avec ressources locales et chemins relatifs dans le dossier réservé. La page doit rester lisible si le JS échoue. Images optimisées, polices locales lorsque possible, pas de CDN obligatoire ni dépendance inutile. Ajouter `noindex,nofollow` aux maquettes de prospection. Ne pas publier de notes commerciales, prompts, captures du Radar, SQL, secrets ou données privées dans GitHub. Seuls les fichiers publics destinés à être vus par le prospect vont sous `public/maquettes/`.

Contrôler le résultat au navigateur : première vue ordinateur et mobile, parcours complet au défilement, interaction signature, clavier, CTA/contact, médias chargés, absence de débordement et mode mouvement réduit. Corriger les problèmes réellement constatés. Ne pas livrer une page statique médiocre simplement parce que le script fonctionne. Conserver une capture d’accueil utilisable pour l’aperçu et un compte rendu honnête des contrôles dans le dossier privé.

La revue visuelle est une porte de sortie, pas une formalité. Examiner les captures ordinateur et mobile côte à côte avec le site source et face à la thèse de design, puis vérifier cinq points : saut de perception évident par rapport à l’existant, singularité liée au métier, qualité suffisante de chaque asset visible, force du premier écran sans animation et cohérence de marque sans dépendre du logo. Si le dirigeant ne peut pas reconnaître son entreprise dans la palette, le ton, les formes ou les signes du lieu, la direction est étrangère à la marque et doit être reprise. Un seul échec impose une correction avant publication.

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

La transaction vérifie propriétaire, appartenance, décision, révision, bail, chemin réservé, étape `production` et présence des deux validations datées. Elle insère l’aperçu immuable dédupliqué SHA-256 et met à jour `presentation=single`, `interactive_url`, `pages.a`, `pages.b=''`, `automation.status=ready` et `automation.stage=ready`. Elle préserve les raisons de Romain, les observations, les anciennes pages et l’historique. Un seul lien, brief ou prototype ne vaut pas livraison.

Relire les références, le propriétaire/dossier/slot, le SHA recalculé depuis le HTML, la nouvelle version et l’absence de choix automatique. Vérifier l’interface connectée si une session est disponible ; sans session, contrôler les données et le site public et signaler précisément cette limite. Ne pas contourner la connexion.

En cas de blocage réel, conserver les sources et checkpoints, puis exécuter `fail` avec les mêmes gardes et `--error` (500 caractères maximum). Garder une erreur courte sans secrets. Aucun achat ni tentative en boucle. Un conflit humain n’est pas une erreur à écrire de force.

## Livraison à Romain

Notifier uniquement une maquette réellement livrée ou un blocage nécessitant son intervention. Répondre en français, sans liste à puces, avec le lien Radar et le lien public, le concept en une phrase et les contrôles/limites utiles. Le parcours devient : retenir l’entreprise, ouvrir la maquette, la valider ou demander une correction. La diffusion à l’entreprise attend une autorisation distincte ; aucun message automatique.

Le script historique `rework-import-pages.py` reste disponible pour les imports A/B anciens, mais n’est plus le protocole de création courante.
