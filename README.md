# Premier client — Radar local et démonstration

Un outil personnel pour identifier des entreprises autour de Vairé, conserver des pistes privées et présenter une démonstration de traitement des réclamations. Les besoins des entreprises restent des hypothèses à confirmer.

## Version Vercel

L'accueil redirige vers `/radar`. Cette page native fonctionne sans ChatGPT, sans iframe et sans MCP : choix du rayon (5–50 km), secteurs, recherche de cinq candidates et fiches officielles. `/api/radar` interroge uniquement l'API publique Recherche d'entreprises ; les erreurs ne sont jamais remplacées par des données fictives. La recherche examine jusqu'à quatre pages et peut retourner moins de cinq candidates si les critères ne sont pas satisfaits. Cache mémoire borné de six heures, délai global de recherche de 45 secondes.

L'onglet Mes pistes utilise Supabase Auth et une base PostgreSQL protégée par RLS. Il permet d'enregistrer une entreprise, de modifier ses notes, son statut et sa prochaine action, puis d'exporter ses pistes. La connexion est réservée aux comptes explicitement autorisés. Sans configuration Supabase, la recherche reste disponible et l'interface indique que la sauvegarde n'est pas encore activée.

Le schéma et la procédure d'activation sont dans `supabase/`. La base distante doit encore être créée et configurée : la présence du code ne signifie pas que la sauvegarde est déjà active.

## Démonstration

`/demo/reclamation` montre un mail fictif transformé en dossier, avec procédure, responsable, échéance et réponse préparée. Les résultats sont simulés, sans modèle IA, téléversement ou envoi de mail.

## Cockpit historique Sites

L'accueil conserve le cockpit « Premier client » et l'authentification ChatGPT dans l'environnement Sites. Les données historiques restent dans D1 ; cette adaptation ne les migre pas. Conserver le Site ChatGPT privé. `/vitrine` redirige vers l'accueil.

Le connecteur historique `/mcp` et sa prévisualisation `/radar-preview` restent dans le dépôt pour Sites. `/mcp` retourne 404 sur Vercel et n'est jamais appelé par le Radar natif. Les fixtures de prévisualisation ne sont jamais utilisées pour la recherche réelle.

## Développement

Node 22.13 ou supérieur ; `npm ci`, puis `npm run dev`. Pour reproduire le mode Vercel localement : `VERCEL=1 npm run dev`. Pour construire Vercel : `npm run build:vercel`. Les deux variables publiques Supabase figurent dans `.env.example`. Ne jamais exposer de clé `service_role` ou secrète.

`npm run typecheck` vérifie les types ; `npm test` teste la recherche et les protections PostgreSQL localement. Les tests historiques du Worker/D1 restent séparés. Une vérification locale ne prouve pas que l'authentification, la sauvegarde distante ou le déploiement fonctionnent tant que le projet Supabase n'est pas configuré.
