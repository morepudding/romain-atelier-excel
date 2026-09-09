# Romain — Automatisation Excel

V1 privée : tableau de travail à la racine, vitrine indépendante sous /vitrine.

## Radar local

Radar local ajoute au cockpit un outil de détection d’entreprises autour de Vairé. Il interroge l’API publique Recherche d’entreprises, exclut les structures cessées, administrations, associations, entrepreneurs individuels, très grandes entreprises et l’écosystème nautique configuré, puis classe les candidates avec des critères explicites. Les résultats restent des hypothèses commerciales à vérifier.

La V1 ne recherche ni personnes ni emails, ne rédige et n’envoie aucun message, n’écrit pas dans un CRM et n’utilise aucune API ou clé OpenAI.

Lancement : `npm run dev`. Prévisualisation avec fixtures : `/radar-preview`. Les états se vérifient avec `?state=results`, `loading`, `empty` ou `error`. Les fixtures sont étiquetées « Données de test » et ne sont jamais utilisées par l’outil MCP. La vue réelle du Site est `/radar`.

Endpoint MCP local : `/mcp`. Après publication : `https://romain-atelier-excel.rombot.chatgpt.site/mcp`.

Dans ChatGPT, ouvrir Réglages → Sécurité et connexion, activer le mode développeur, ouvrir Plugins, cliquer sur `+`, puis saisir l’URL MCP complète. Vérifier l’outil « Trouver des entreprises locales » et démarrer une nouvelle conversation avec la connexion activée.

Pour un serveur local privé, créer un tunnel dans les réglages Tunnels de la plateforme OpenAI, configurer `tunnel-client` vers l’endpoint local, puis lancer `tunnel-client doctor --profile <nom> --explain` et `tunnel-client run --profile <nom>`. Dans ChatGPT Plugins, choisir Tunnel et le `tunnel_id`. Cette opération nécessite les droits Tunnels Read + Use et la clé d’exécution du tunnel ; Radar local lui-même ne demande aucune clé OpenAI.

La source publique peut être lente, limiter les requêtes ou fournir un effectif inconnu. Le client respecte `Retry-After`, limite les répétitions, impose un délai maximal et conserve un cache mémoire pendant six heures. Une panne retourne une erreur claire, jamais des entreprises fictives.

Le centre, le rayon, les secteurs et les exclusions sont dans `lib/radar/config.ts`. Le classement et les formulations sont dans `lib/radar/logic.ts`.

## Accès et données

Le contrôle d’accès global Sites doit rester propriétaire seul. Il protège le Worker, les routes, les fichiers et les données. Le serveur exige en plus une identité ChatGPT pour / et chaque opération /api/sectors. Toutes les lectures/écritures de notes sont limitées à l’identifiant utilisateur transmis par Sites. Aucune inscription ouverte. Aucun secret dans le client.

**Ne pas rendre ce Site public dans cette V1.** Avant de partager la vitrine seule, ajouter un contrôle propriétaire explicite côté serveur sur / et /api/sectors, ou séparer la vitrine dans un Site dédié. Le dossier de recherche est uniquement importé côté serveur. La vitrine importe uniquement ses exemples fictifs ; les notes sont dans D1, jamais dans les fichiers client. Une route cachée ou la simple connexion ChatGPT ne remplace pas ce contrôle propriétaire.

Les états se sauvegardent avec le bouton Enregistrer. Le compteur de version empêche un appareil d’écraser silencieusement les changements d’un autre. Actualiser récupère les données distantes. Pas de promesse de synchronisation instantanée. Une saisie non enregistrée reste seulement en mémoire ; avertissement à la fermeture et champs désactivés pendant l’enregistrement.

## Vérification

- Build de production réussi ; vérification TypeScript réussie.
- `node tests/worker-smoke.mjs` : tests du Worker construit dans Miniflare et D1. Pages, refus anonymes, refus origine tierce, validation, lecture après écriture, isolation utilisateurs et conflit de version passent.
- `node tests/api-smoke.mjs` : même scénario contre un serveur local explicitement lancé. Les identités test sont simulées, jamais proposées comme preuve d’authentification de la plateforme.
- Aucune QA navigateur, aucun test visuel ou parcours mobile réel effectué.
- Recherche privée absente des fichiers dist/client (contrôle de contenu) ; migrations D1 inspectées, schéma uniquement.

Le serveur de test HTTP Wrangler a rencontré une défaillance de son proxy local Windows ; les tests ont donc été exécutés directement sur le Worker, sans ce proxy. Aucun contournement de contrôle d’accès en production.

## Contenu

Dix secteurs issus des quatre dossiers fournis en lecture seule. Faits, inférences, sources et limites séparés ; aucune niche ou opportunité active déclarée validée. Formasport : copie Hellowork citée, source France Travail précédemment en 404. Noroît conservé en pause sans modification du prototype.

Vitrine : trois démonstrations fictives et préétablies, aucun fichier client traité, aucun envoi de formulaire. Coordonnées à renseigner avant partage aux prospects ; aucun tarif ni gain chiffré promis.

## Dépendances

Scaffold Sites 0.3.0 conservé. React, React DOM et React Server DOM ont reçu le correctif 19.2.8 pour la vulnérabilité de déni de service signalée dans le scaffold. D’autres alertes restent dans les outils du scaffold et ses dépendances transitives (13 après correction, dont 7 élevées) ; pas de mise à niveau globale risquée. Elles doivent être réévaluées avant une ouverture publique. Aucun upload ni traitement d’image n’est exposé par le produit.
