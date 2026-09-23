# État actuel

## Avis Jev dans Radar Rework — 23 septembre 2026

Le tri peut demander un avis Jev sur le dossier affiché. L’appel est explicite et envoie à OpenRouter uniquement le nom, le secteur, la commune, l’état du site, le type de piste et les observations enregistrées. Jev renvoie une recommandation typée avec probabilités ; il ne rédige pas d’explication, n’écrit rien dans Supabase et ne prend jamais la décision à la place de Romain. Le coût retourné par OpenRouter est montré après chaque appel.

L’API est réservée aux membres du Radar, vérifie la révision du dossier, borne la taille des observations et conserve `OPENROUTER_API_KEY` côté serveur. La clé n’est pas dans le dépôt. Un appel de test avec des données fictives a répondu : 604 jetons d’entrée, coût retourné de 0,000025368 $. Le code et les tests sont prêts, mais la variable reste à ajouter aux environnements Preview et Production du projet Vercel avant l’essai connecté.

## Radar Rework — skill signature et validations bloquantes, 16 septembre 2026

Le workflow de vitrine utilise désormais le skill personnel `$rework-vitrine-signature`. Coif’Hommes devient un plancher de finition technique à dépasser et non un style à recopier. Le skill impose une direction unique, une apparition réelle du logo ou mot-symbole lorsque disponible, une interaction signature non bloquante et l’accès direct aux informations essentielles sans chasse aux clics.

Deux arrêts humains sont obligatoires. Le premier intervient après l’audit et la direction artistique, avant tout code. Le second intervient après un prototype limité à l’introduction, au premier écran, à la première transition et à l’interaction signature. Le générateur SQL enregistre `awaiting_direction / direction_review`, puis `awaiting_opening / opening_review`. Chaque accord explicite date la validation et remet le dossier en file pour l’étape suivante. La livraison finale exige techniquement les deux accords ; une autorisation ancienne, le lancement du chat ou une correction ne les remplace pas.

Les nouvelles corrections utilisent `signature-v1`. Une ancienne série `interactive-v1` encore en file est reprise dans ce protocole au prochain claim. Le prompt Radar invoque explicitement le skill, transmet les identifiants du dossier et du propriétaire, expose l’étape enregistrée et reprend au bon jalon. Les Touristes ne doivent plus recevoir de nouvelle version complète avant validation de leur direction puis de leur ouverture.

## Radar Rework — cohérence de marque obligatoire, 16 septembre 2026

Le workflow distingue désormais les ressources à jeter de l’identité à préserver. Avant toute direction, le lancement impose une matrice « préserver / moderniser / abandonner » couvrant palette, mot-symbole, ton typographique, formes, motifs et signes physiques du lieu. Refuser les photos faibles ne permet plus de remplacer l’entreprise par une belle image générique de son secteur ou de sa destination. Une stratégie sans photo doit reprendre au moins trois ancrages de marque et justifier toute rupture.

La revue visuelle compare maintenant la proposition au site source, sur ordinateur et mobile. La porte de sortie exige que le dirigeant puisse encore reconnaître son établissement sans dépendre du logo. La première correction des Touristes, fondée sur une affiche atlantique bleu nuit, est explicitement rejetée : elle racontait la Vendée mais pas l’hôtel. La nouvelle série reprend le bleu ciel, le blanc, le bordeaux, la signature manuscrite et les lignes de balcons dans une façade graphique HTML/CSS, sans réutiliser les photos du site.

## Radar Rework — barre de qualité visuelle renforcée, 16 septembre 2026

Le lancement d’une refonte demande désormais explicitement un saut de perception, pas une simple remise au propre du site existant. Le site source reste une preuve documentaire mais n’impose plus ses photos : chaque asset est trié et une image authentique mais trop faible doit être refusée. En l’absence de visuel réel assez fort, la maquette peut s’appuyer sur une composition HTML/CSS ou une illustration d’ambiance clairement signalée, sans inventer de façade, chambre, équipe ou réalisation présentée comme réelle.

Le prompt de lancement et le protocole imposent une thèse de design avant le code, un effet lisible dans les trois premières secondes, une interaction liée au métier, des clichés interdits et une revue visuelle ordinateur/mobile. Une proposition générique, trop sage, interchangeable avec un concurrent ou dominée par des ressources faibles doit être reprise avant publication. La première correction des Touristes a montré la limite de ce garde-fou : aucune photo faible n’était reprise, mais l’affiche atlantique et le geste de marée avaient effacé l’identité propre de l’hôtel. La porte de cohérence de marque ajoutée ensuite corrige précisément cette dérive.

## Radar Rework — triage sur demande, 16 septembre 2026

Radar Rework est désormais un écran de tri rapide : une seule entreprise à la fois, aperçu du site quand il existe, identité, activité/localisation et jusqu’à trois signaux observés. Les décisions visibles sont « Non, écarter », « Revoir plus tard » et « Oui, à refaire », avec boutons persistants, flèches clavier et swipe tactile en complément. Le report persiste dans le JSONB sous `triage_snoozed_at` et repousse la fiche en fin de pile ; les mises à jour restent protégées par propriétaire et révision.

L’onglet « Retenues » ne montre que les entreprises retenues et une prochaine action : « Lancer la refonte ». Cette action prépare et copie un prompt structuré puis ouvre `https://chatgpt.com/` si le navigateur l’autorise ; elle ne prétend pas créer un chat, ne joint pas automatiquement les captures privées et n’appelle aucune génération. Un fallback visible permet de copier le prompt manuellement si le presse-papiers ou l’ouverture est bloqué. Le prompt reprend identité, URL, sources, observations, raison de sélection, workflow Coif’Hommes et garde-fou sans envoi avant décembre 2026.

Les dossiers détaillés, anciennes propositions et maquettes restent accessibles via « Tous les dossiers ». La décision de tri n’enqueue plus de production automatique ; les files antérieures et leurs artefacts sont conservés. Tests de flux, persistance, conflit de révision, prompt et protections existantes passés ; typecheck, lint ciblé et build de production passent. Le parcours connecté n’est pas vérifié localement faute de variables Supabase dans ce checkout.

## Radar Rework — workflow interactif officiel, 14 septembre 2026

Romain a validé Coif’Hommes comme nouveau niveau de qualité et autorisé l’automatisation après chaque entreprise retenue. Le standard est une seule maquette interactive, une direction artistique adaptée au métier, des contrôles ordinateur/mobile/mouvement réduit, un lien Vercel public et un aperçu privé rattaché dans Radar. Le protocole officiel est `scripts/REWORK_DELIVERY.md`.

Les nouvelles décisions Retenir et demandes de correction inscrivent `automation.workflow=interactive-v1,status=queued` ; les anciennes comparaisons et les suspensions ne sont pas migrées implicitement. Le bureau et la décision dans le dossier détaillé utilisent le même mécanisme. Un ancien dossier retenu non livré peut entrer dans la file avec « Créer la maquette ». Le navigateur relit seulement les dossiers, sans appel au générateur payant. L’ancienne API ignore explicitement les dossiers de ce workflow.

Le worker ChatGPT doit relever la file chaque heure, un dossier à la fois, indépendamment du navigateur. `scripts/rework-interactive.py` génère les transactions de réservation, checkpoint, erreur et livraison : bail de 90 minutes, garde membre/propriétaire/révision/choix humain, pas de doublon pendant un bail, reprise des artefacts et arrêt après trois interruptions. Aucune migration ni nouveau fournisseur IA. Le chemin `public/maquettes/<dossier>/v<N>` est réservé au premier démarrage et conservé lors des reprises. Les corrections créent un chemin distinct pour préserver les anciens liens. Les maquettes suivantes sont publiées par le déploiement Git de Radar sur Vercel, sans créer un projet par entreprise. Les notes et aperçus privés restent hors du dépôt public.

L’activation de la tâche horaire accompagne la publication et la vérification de ce code. Les tâches de découverte hebdomadaire et les anciens essais restent distincts. Aucun contact automatique avec les entreprises. La maquette Coif’Hommes déjà livrée reste sur son URL publique actuelle.

Vérifications : 44 tests réussis, dont exécution du SQL réel sur PGlite avec les migrations du projet (réservation unique, reprise, arrêt après interruptions, refus de révision/bail/chemin invalides et rattachement atomique). Typage et lint contrôlés. La maquette servie sous le chemin public de Radar est accessible sans connexion, ses médias chargent et aucun débordement n’est constaté sur la vue contrôlée. Le parcours du compte personnel connecté reste non vérifié dans ce navigateur.

## Radar Rework — proposition interactive unique, 14 septembre 2026

Ajout d’un mode explicite par dossier `presentation: single` et d’un `interactive_url` HTTP(S) filtré. Une proposition unique peut être validée sans direction B ; les dossiers A/B conservent leur fonctionnement par défaut. Coif’Hommes a servi de pilote ; Romain a ensuite validé le workflow officiel décrit ci-dessus.

Romain a autorisé la publication du code Radar et demandé un lien Vercel accessible au prospect sans compte ChatGPT. La maquette seule est publiée sur https://coif-hommes-experience.vercel.app/ dans le projet Vercel `coif-hommes-experience` (production READY). Les fichiers portables se trouvent dans `public/maquettes/coif-hommes/` ; toutes les ressources sont relatives. Romain a ensuite autorisé explicitement la publication des modifications sur la branche `main` du dépôt public `morepudding/romain-atelier-excel`, puis la mise à jour de Radar sur Vercel. Le rattachement de Coif’Hommes utilise le lien Vercel public, le mode unique et un aperçu statique privé ; il est exécuté après confirmation du déploiement de cette interface. Radar ouvre le lien dans un nouvel onglet avec noopener/noreferrer et conserve un aperçu HTML statique privé. La sandbox et la CSP des iframes ne sont pas assouplies. Les références aux anciennes pages et les révisions restent conservées dans l’historique. Une demande de correction efface aussi le lien actif pour éviter de valider une version périmée. À cette étape du pilote, aucun changement de l’activation payante ni des consignes officielles de génération.

Vérifications : typage, lint et 42 tests réussis, dont le nouveau cas de validation unique, le refus du choix B et des liens javascript:, ainsi que la conservation du mode A/B. Revue ciblée des composants React : effet annulable et dépendances stables conservés, pas de bibliothèque d’animation ajoutée au Radar. Le parcours connecté reste à confirmer avec la session du propriétaire.

## Radar Rework — pages consultables et livraison agent, 14 septembre 2026

Le bureau accepte désormais les propositions HTML/CSS autonomes en plus des images. Les UUID `data.pages.a/b` pointent vers `radar_rework_pages`, table privée avec appartenance membre, propriétaire et dossier vérifiés. Les pages sont immuables, dédupliquées par empreinte et conservées lors des révisions. Un trigger refuse toute référence inexistante ou appartenant à un autre dossier/slot. Les pages ne sont pas dans le dépôt public.

Les deux propositions se comparent dans « Propositions à choisir », s’ouvrent en grand, avec commandes Ordinateur/Mobile, et restent disponibles dans les dossiers détaillés et après choix. Les iframes isolées interdisent scripts, accès au parent, formulaires et ressources réseau ; seules les images/polices data: et styles intégrés sont acceptés. Les choix et demandes de correction utilisent le même contrôle de révision que précédemment.

La préparation payante est désactivée par défaut (`REWORK_PAID_GENERATION_ENABLED` absent ou différent de true), avant tout accès au fournisseur. Le travail vient de l’agent ; aucun crédit IA n’est requis pour lire les pages ou les intégrer. Le protocole durable `scripts/REWORK_DELIVERY.md` et le générateur SQL `scripts/rework-import-pages.py` permettent une livraison atomique et idempotente via le connecteur Supabase existant. La sauvegarde du brief seule ne vaut plus livraison visuelle.

Migration appliquée au projet radar-local. Les quatre pages du pilote sont enregistrées et rattachées aux deux dossiers existants, révision 3 ; empreintes et historique relus. Choix humains conservés. Vérifications : typage, lint et 41 tests réussis, dont pages privées, refus de références invalides, choix A/B sans image et préservation de l’historique. L’audit Supabase ne relève aucun défaut RLS des nouvelles tables ; l’avertissement Auth préexistant est hors périmètre. Le navigateur de contrôle n’a pas de session personnelle connectée : ce parcours réel n’est pas encore vérifié visuellement.

## Radar Rework — validations du 14 septembre 2026

Le parcours par défaut devient un bureau de validation : retenir ou passer une entreprise, puis comparer visuellement deux propositions et en choisir une. Aucun champ obligatoire dans ces deux décisions ; enregistrement immédiat avec contrôle de révision. Les dossiers détaillés, imports, exports, références et versions restent accessibles dans « Tous les dossiers ». Les entreprises déjà retenues sont reprises sans nouvelle validation. Un choix peut être revu ; une consigne courte facultative relance les propositions tout en conservant les versions précédentes.

La préparation appelle désormais des modèles via Vercel AI Gateway : lecture HTML publique protégée, brief et directions structurés avec GPT-5.4 mini, puis deux images avec Gemini 3.1 Flash Image. Les images de référence déjà jointes sont utilisées. Sans référence jointe, le générateur privilégie l’illustration ou la matière et ne présente pas de photo inventée comme une réalisation attestée. Les maquettes sont des images conceptuelles, pas des sites codés. Les images sont enregistrées dans le stockage privé existant ; les projets et leur historique restent soumis aux mêmes droits.

L’accès au fournisseur est contrôlé par une lecture du solde avant tout appel, avec clé serveur ou OIDC Vercel. Un fournisseur absent ou sans crédit produit un état indisponible explicite, jamais une fausse maquette. Chaque étape est sauvegardée séparément. Une réservation par révision empêche les appels concurrents ; un choix humain intervenu pendant une génération prime sur le résultat tardif. Les échecs s’arrêtent sans relance payante automatique, avec un plafond de neuf tentatives par série. La file s’exécute tant que le bureau est ouvert ; après fermeture, les étapes restantes reprennent à la prochaine ouverture. Ce n’est pas un worker permanent. La recherche de nouvelles entreprises reste administrative : elle ne réalise pas encore un audit visuel automatique des sites.

Vérifications réussies : typage, lint, 40 tests, build Vercel et tests du serveur compilé. Le fournisseur simulé vérifie brief, deux images, reprise après échec sans répéter A, absence de relance des dossiers terminés et priorité au choix humain pendant une génération. Le déploiement de contrôle est READY et l’authentification AI Gateway fonctionne via le contexte OIDC de la requête. Son solde ne permet actuellement aucune génération : l’API renvoie available=false, reason=credits. Aucun appel de génération payant n’a été effectué. Le bureau avec une session Supabase personnelle reste non vérifié visuellement dans le navigateur de contrôle (connexion nécessaire). Aucun message n’est envoyé aux entreprises.

## Radar Rework — 13 septembre 2026

Le mode Refonte devient Radar Rework dans `/radar`, avec un accès direct `/radar/rework`. Il utilise le même compte Supabase que le Radar local et propose des dossiers privés filtrables, l’ajout manuel et la recherche administrative par lots de huit. Les SIREN du carnet local et des dossiers Rework sont exclus des recherches suivantes ; l’import et l’ajout vérifient aussi le domaine et le nom/commune. La recherche relit uniquement les SIREN, sans transférer les briefs et notes. Sans identifiant confirmé, les homonymes et changements de raison sociale demandent encore un contrôle humain.

Chaque dossier distingue les observations sourcées et datées, l’avis initial de l’assistant, la décision humaine, sa motivation et l’angle à explorer. Un site inaccessible et un site propre non trouvé restent deux états distincts. Les dossiers retenus peuvent préparer un brief et deux directions textuelles selon le métier, entièrement modifiables. Ce sont des canevas éditoriaux : aucun appel à un modèle de génération d’images n’est branché. Les références et maquettes peuvent être jointes en PNG/JPEG/WebP et une direction choisie. Les exports JSON conservent les dossiers et références d’images ; ils ne copient pas les fichiers du stockage privé. Un export Markdown emporte le brief et les directions.

Les tables `radar_rework_projects` et `radar_rework_versions` utilisent l’appartenance à `radar_members` et la propriété utilisateur. Chaque enregistrement conserve une version complète. Les mises à jour utilisent un numéro de révision ; un onglet obsolète ne peut pas écraser une correction. Les images sont dans le bucket privé `radar-rework`, sous le chemin utilisateur/dossier, consultables par URL signée. Les migrations `20260913205521_radar_rework.sql` et `20260913205821_radar_rework_images.sql` sont appliquées au projet dédié. Les données du document fourni ont été importées dans le compte privé ; ni les noms ni les jugements du lot ne sont intégrés au code public.

Vérifications : typecheck, lint, 37 tests, build Vercel et test du serveur compilé (page Rework, limite de huit, exclusions du carnet Rework, erreur de lecture). Le contrôle Supabase ne signale pas de défaut RLS des nouvelles tables. La version intégrée est déployée sur Vercel. L’écran de connexion de `/radar/rework` et la bascule Radar local/Rework sont vérifiés dans le navigateur en production. Le parcours avec une session Supabase connectée et l’envoi réel d’un fichier ne sont pas vérifiés dans ce navigateur. Le navigateur de contrôle ne peut pas joindre localhost. Une erreur de préchargement RSC de vinext apparaît aussi sur la version précédente ; elle n’empêche pas la bascule entre les deux radars. Aucun message commercial n’est envoyé et aucune maquette n’est publiée pour une entreprise.

## Vidéo Maison Martin — 13 septembre 2026

La page `/demo/maison-martin` utilise désormais la mini-BD ChatCut V14 validée : 45 secondes, Full HD, voix off, musique et bruitages. Le lecteur conserve ses commandes, la lecture au clic et le mode intégré sur mobile. Une image extraite de la vidéo sert d’aperçu et une piste française de sous-titres est disponible. La durée affichée et le texte du cas fictif sont mis à jour. Le fichier de la précédente vidéo reste conservé.

Source : projet ChatCut `638d5de1-2c6d-4cc4-93c5-c3fe4e9cf354`, séquence `449ab68a-116b-4e78-9fec-b41f73dba161`, export `986df563-d37c-4e39-bb5c-1b92f9d3565e`. Média contrôlé : H.264 1920 × 1080, audio AAC, environ 45 secondes. Typecheck, lint ciblé et build Vercel réussis. Lecture vérifiée dans le navigateur sur le déploiement `dpl_A11SvxPP4hxQXQ7kThhFUehJvo14` : aperçu visible, temps de lecture qui avance, son non coupé, piste française présente et aucune erreur du lecteur. Le mixage n’a pas fait l’objet d’une nouvelle écoute humaine.

## Retour vers le cockpit depuis les pages secondaires — 11 septembre 2026

Le Radar `/radar` et la vidéo `/demo/maison-martin` proposent désormais un accès direct au cockpit principal (`/`) dans leur en-tête. Le retour contextuel vers le Radar depuis la vidéo est conservé.

Vérifications : typecheck, lint ciblé, 33 tests, build Vercel et réponses HTTP 200 de `/`, `/radar` et `/demo/maison-martin` sur le serveur local. Aucun déploiement ni changement de données n’a été effectué.

## Sélecteur Radar Refonte — 11 septembre 2026

Le Radar `/radar` propose désormais un sélecteur entre « Radar local » et « Radar Refonte ». Le radar local, sa recherche, ses fiches et « Mes pistes » restent inchangés. Le mode Refonte recherche dans l’annuaire officiel les entreprises et associations actives de petite taille autour de Vairé, sans consulter ni évaluer leur site internet. Les résultats affichent uniquement leur identité, leur activité, leur commune, leur distance et leur fiche officielle.

La recherche est bornée à cinq résultats, échantillonne des pages profondes pour éviter la domination des grands réseaux et exclut les SIREN déjà enregistrés dans le carnet du propriétaire. Les associations, les entreprises individuelles et les structures à zéro salarié restent éligibles dans ce mode. Aucun score de site, aucune hypothèse commerciale et aucune cible fictive ne sont produits.

Vérifications : typecheck, lint ciblé, 33 tests, build Vercel, réponse HTTP 200 de `/radar`, réponse HTTP 200 de l’API Refonte avec cinq résultats réels dont quatre entreprises et une association à 5 km, et réponse HTTP 400 pour un rayon invalide. Aucun déploiement ni changement de données n’a été effectué.

## Démonstration vidéo Maison Martin — 11 septembre 2026

La vidéo Maison-Martin_60s_Full-HD.mp4 remplace l’ancienne démonstration interactive de réclamation dans la navigation. Elle est servie par /demo/maison-martin, avec un lecteur vidéo Full HD et un habillage de présentation. L’ancienne route /demo/reclamation redirige vers cette nouvelle page ; ses composants restent conservés dans le dépôt pour préserver l’historique.

## Vitrine publique intégrée — 11 septembre 2026

La vitrine commencée dans design/vitrine/ est maintenant la page d’accueil publique / et reste accessible sur /vitrine. Elle reprend la palette ivoire, vert forêt, sauge et ambre, le monogramme r., Manrope, Instrument Serif et l’accroche « Votre métier. En plus simple. ».

Les accès de la vitrine sont réels : Radar local ouvre /radar et Vidéo Maison Martin ouvre /demo/maison-martin. Le visuel central reste explicitement illustratif et fictif ; il ne simule ni IA ni envoi de message.
## Direction de la vitrine — 10 septembre 2026

La deuxième proposition locale du premier écran est disponible dans `design/vitrine/` : accueil et planche palette/typographies. Romain apprécie l’apparition du logo, l’espace et la composition centrale ; il demande de sortir complètement des bougies et de renforcer la navigation, le contact et le texte d’introduction. La palette, Manrope, Instrument Serif et l’accroche « Votre métier. En plus simple. » sont conservés. La navigation est plus grande et plus marquée, le contact devient un bouton vert, le texte d’introduction est agrandi et plus contrasté.

Le visuel central montre maintenant un message, une application de suivi des demandes et un assistant qui prépare une réponse. Les deux vues sont illustratives, avec des données fictives, en attendant les démonstrations préparées par Romain. L’aperçu s’agrandit dans une fenêtre. Le film, ses images et ses liens ont été retirés de la maquette servie. La première proposition est archivée dans `work/vitrine-direction-v1/` ; les références originales restent intactes.

La direction attend la validation de Romain avant de décliner les sections et les versions ordinateur et mobile. Aucune route de l’application, donnée distante ou configuration de déploiement n’a été modifiée pour cette proposition. Les travaux du radar déjà présents restent conservés.

Vérifications de la deuxième maquette : rendu et absence de débordement horizontal à 1440 et 1100 px, chargement des polices, commandes du slider au clic et au clavier, ouverture de l’aperçu agrandi et fermeture par Échap, panneau de contact explicite et réduction des animations. Aucune erreur JavaScript ni requête échouée pendant ces contrôles. Syntaxe et lint du script de maquette vérifiés. Captures et compte rendu dans `design/vitrine/previews/`. Pas de build de l’application pour ces fichiers HTML autonomes ; pas de publication.

## Recherche publique préparée localement — 10 septembre 2026

Exclusion des pistes enregistrées : chaque recherche connectée transmet la session au serveur, qui relit uniquement les SIREN du propriétaire dans Supabase, tous statuts confondus et avec pagination. Les règles RLS restent en place. Les SIREN sont exclus avant le classement et la limite de cinq ; le radar poursuit les pages prévues pour chercher des remplaçantes. Les doublons de SIREN entre pages sont aussi supprimés. Le cache mémoire distingue les exclusions, les réponses HTTP sont privées et non mises en cache, et une erreur de lecture du carnet interrompt la recherche avec un message explicite. Les recherches anonymes restent disponibles.

Validation de l'exclusion : 29 tests réussis, typecheck, lint des fichiers modifiés, build Vercel et tests du serveur généré (lecture fraîche des pistes, cache privé, session expirée et erreur de lecture). Scénario navigateur isolé avec compte et carnet fictifs : transmission de la session, exclusion d'une piste existante, ajout puis nouvelle recherche excluant les deux pistes. Essai sur la source publique réelle : après exclusion des cinq premières candidates, cinq remplaçantes distinctes ont été trouvées à 35 km. Le carnet personnel n'a pas été modifié et aucune publication n'a été faite. La correction est active sur `http://127.0.0.1:5178/radar`.

Correction de « Failed to fetch » après connexion : le serveur local s'était arrêté avec `EBUSY` pendant la surveillance de `design/vitrine/assets/ambre.png`, modifié dans un autre travail en cours. Le port 5178 ne répondait plus. La configuration Vite utilise désormais le polling sous Windows et ignore les sorties `.vercel/` et `work/`. Le serveur a été relancé en arrière-plan sur le même port, avec ses journaux dans `work/server-5178.stdout.log` et `work/server-5178.stderr.log`. Les erreurs réseau de recherche sont affichées en français. Aucun fichier de la vitrine n'a été modifié pour cette correction.

Validation : recherche réelle dans le navigateur, HTTP 200 et cinq entreprises affichées à 35 km ; serveur toujours disponible pendant le verrouillage exclusif d'un fichier image temporaire, supprimé après l'essai. Typecheck et lint des trois fichiers modifiés réussis. Le lint global rencontre une erreur préexistante à cette correction dans `design/vitrine/film/catalogue-film.js:120`, laissé intact. Un avertissement de développement `@vitejs/plugin-rsc` sur `import` reste présent au rechargement ; il n'a pas empêché la recherche vérifiée. La recherche automatique avec la session personnelle de Romain reste à réessayer ; aucun jeton personnel n'a été lu et aucune publication n'a été faite.

Correction locale du blocage de la case après connexion : l'autorisation de rechercher est activée dès la lecture du membre, avant le chargement des pistes. Une erreur du carnet ne bloque donc plus la recherche et n'affiche plus à tort un carnet vide. Les lectures sont bornées à dix secondes. Une erreur de vérification des droits est distinguée d'une absence de connexion et propose un réessai ; un compte non autorisé reste bloqué. Depuis la case, un visiteur peut ouvrir directement la connexion puis revenir à sa recherche avec l'option activée.

Vérification de cette correction : typecheck, lint, 24 tests et build réussis. Dans un navigateur isolé avec des réponses Supabase fictives, la case est activée et modifiable malgré une erreur de lecture des pistes ; une erreur de vérification des droits la bloque avec une explication, puis le bouton de réessai rétablit l'accès sans reconnexion. Ces essais ne valident pas la session personnelle de Romain. La base distante confirme un compte membre, confirmé, avec des droits de lecture sur les deux tables ; aucune modification de compte ou de base n'a été faite. Correction disponible sur `http://127.0.0.1:5178/radar`, non publiée sur Vercel.

La nouvelle fiche de contact est développée dans `C:\RomainOpen\romain-atelier-excel`, sans publication ni modification de la base distante. Elle sépare les extraits sourcés, l'identité du site, les contacts publiés, l'hypothèse commerciale, les questions à poser, la partie de la démo et le brouillon à copier. Le classement place d'abord les entreprises dont l'identité est confirmée avec un indice métier et un contact ; aucune probabilité de réponse n'est calculée.

Le serveur lit directement jusqu'à six pages par site, vérifie les adresses IP et les redirections, et n'exécute aucun script du site. Un homonyme non identifié ne fournit ni preuve attribuée ni message. La découverte des sites est raccordée à Tavily et réservée aux membres Supabase. La clé `TAVILY_API_KEY` est désormais installée et validée localement. Son installation sur Vercel et la publication restent à effectuer. Procédure d'activation dans `README.md`.

Vérifications locales : 24 tests, typecheck et lint ; build Vercel ; smoke test du serveur généré (validation, origine, taille, URL privée, fournisseur absent, refus anonyme, radar et démo). La copie des dépendances Nitro sous Windows provoquait EBUSY ; le build a réussi avec `UV_THREADPOOL_SIZE=1`. Le serveur Vite de développement doit être arrêté pendant un build, car son watcher peut rencontrer un verrou sur `.vercel/output`. Ne pas publier le paquet Windows : laisser Vercel reconstruire depuis les sources.

Navigateur : recherche réelle de cinq entreprises, saisie d'un site, consultation de la fiche et des limites vérifiées. PPMC a été rattachée par son SIREN sur le site Papa Pique et Maman Coud ; aucun indice métier suffisamment précis dans les pages lues. Le site Bougies de Charroux n'a pas été rattaché avec certitude et ses contenus n'ont pas été attribués à la candidate. Un scénario séparé, explicitement fictif, a vérifié la fiche prioritaire, les sources et « Message copié ». Les captures locales sont dans `work/` (ignoré par Git).

Avant la mise en ligne : renseigner la clé Tavily côté serveur, autoriser et appliquer `supabase/migrations/20260910_research_snapshot.sql`, publier via le projet Vercel existant, puis tester connecté la recherche automatique et la persistance d'une fiche. La migration n'a pas été appliquée à distance. PGlite valide localement la conservation des notes, la relecture de la recherche, les droits et les conflits de révision. La connexion réelle du propriétaire reste à vérifier. Aucun message n'a été envoyé aux entreprises et aucune modification de la démo n'a été faite.

Configuration locale complémentaire : `.env.local`, ignoré par Git, contient les paramètres publics Supabase et la clé Tavily fournie par Romain. Aucune valeur secrète ne figure dans les sources ou ce document. Romain indique avoir désactivé Pay As You Go ; aucune option de facturation n'a été modifiée par l'agent.

Activation vérifiée le 10 septembre 2026 : appel Tavily réel HTTP 200, puis un essai complet de recherche sur PPMC. Ce dernier n'a pas identifié de site avec certitude et n'a attribué aucun indice ni généré de message. Après redémarrage du serveur local, `/api/radar/research` répond HTTP 200 avec `automaticSearchAvailable: true`, `/radar` répond 200 et une recherche automatique anonyme est refusée avec 401. Dans le navigateur, le message invite désormais à se connecter dans Mes pistes ; le formulaire de connexion est présent. L'utilisateur doit se connecter avec son compte radar autorisé pour utiliser la case. Aucun paramètre Vercel n'a été modifié.

## En ligne

La PR #1 est fusionnée. Le Radar natif sans MCP reste publié sur https://romain-atelier-excel.vercel.app/radar. La vitrine publique est désormais la page racine et propose les accès au Radar local et à la vidéo Maison Martin. Version contrôlée le 11 septembre 2026 : 3deeeef, déploiement Vercel READY.

Projet Supabase `radar-local`, référence `tsgxdokkqzgglenjsaxr`, créé dans `morepudding’s Org`, région Paris, offre gratuite confirmée. Migration `radar_private_leads` appliquée ; RLS active sur les deux tables, audit sans anomalie. Compte propriétaire créé par l’utilisateur, adresse confirmée et accès ajouté à `radar_members` le 10 septembre 2026. Autorisation vérifiée en base ; lecture des pistes sous le rôle authenticated exécutée sans erreur.

## Vérifications

Recherche réelle dans le navigateur : cinq entreprises affichées dans un rayon de 35 km autour de Vairé. Interface du carnet et formulaire de connexion présents, démonstration réclamation accessible. Quatorze tests passent, dont les protections PostgreSQL et la concurrence ; scénarios supplémentaires de pagination profonde et de dernière page testés.

L’API géographique ignore les filtres PME et état administratif : seuls les filtres d’activité sont appliqués à la source. Ces paramètres inutiles ont été retirés. Le radar échantillonne désormais des pages plus profondes pour dépasser les grands réseaux dominants ; les exclusions, le rayon et le classement sont appliqués localement. La recherche est une sélection non exhaustive, plafonnée par un délai global.

## À terminer

Vérifier la première connexion du propriétaire dans le navigateur, puis l’enregistrement et la relecture d’une piste. Le compte et son autorisation sont en place ; le parcours complet de sauvegarde dans le navigateur reste à valider.

## Priorité

Les hypothèses commerciales restent à confirmer. Démo réclamation et cockpit historique Sites conservés. Aucun envoi de message ni migration des anciennes données D1.
