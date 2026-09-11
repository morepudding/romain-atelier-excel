# État actuel

## Démonstration vidéo Maison Martin — 11 septembre 2026

La vidéo Maison-Martin_60s_Full-HD.mp4 remplace l’ancienne démonstration interactive de réclamation dans la navigation. Elle est servie par /demo/maison-martin, avec un lecteur vidéo Full HD et un habillage de présentation. L’ancienne route /demo/reclamation redirige vers cette nouvelle page ; ses composants restent conservés dans le dépôt pour préserver l’historique.

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

La PR #1 est fusionnée. Radar natif sans MCP publié sur https://romain-atelier-excel.vercel.app/radar. Dépôt GitHub relié au projet Vercel ; paramètres Supabase enregistrés en Production et Preview. Dernière version contrôlée au début de cette intervention : d785ead, déploiement dpl_D3wvQEWT7hgQbMNS6vhMuuegS5mh. Les changements locaux décrits ci-dessus n'y figurent pas.

Projet Supabase `radar-local`, référence `tsgxdokkqzgglenjsaxr`, créé dans `morepudding’s Org`, région Paris, offre gratuite confirmée. Migration `radar_private_leads` appliquée ; RLS active sur les deux tables, audit sans anomalie. Compte propriétaire créé par l’utilisateur, adresse confirmée et accès ajouté à `radar_members` le 10 septembre 2026. Autorisation vérifiée en base ; lecture des pistes sous le rôle authenticated exécutée sans erreur.

## Vérifications

Recherche réelle dans le navigateur : cinq entreprises affichées dans un rayon de 35 km autour de Vairé. Interface du carnet et formulaire de connexion présents, démonstration réclamation accessible. Quatorze tests passent, dont les protections PostgreSQL et la concurrence ; scénarios supplémentaires de pagination profonde et de dernière page testés.

L’API géographique ignore les filtres PME et état administratif : seuls les filtres d’activité sont appliqués à la source. Ces paramètres inutiles ont été retirés. Le radar échantillonne désormais des pages plus profondes pour dépasser les grands réseaux dominants ; les exclusions, le rayon et le classement sont appliqués localement. La recherche est une sélection non exhaustive, plafonnée par un délai global.

## À terminer

Vérifier la première connexion du propriétaire dans le navigateur, puis l’enregistrement et la relecture d’une piste. Le compte et son autorisation sont en place ; le parcours complet de sauvegarde dans le navigateur reste à valider.

## Priorité

Les hypothèses commerciales restent à confirmer. Démo réclamation et cockpit historique Sites conservés. Aucun envoi de message ni migration des anciennes données D1.
