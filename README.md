# Premier client — Radar local et démonstration

Un outil personnel pour identifier des entreprises autour de Vairé, conserver des pistes privées et présenter des démonstrations métier. Les besoins des entreprises restent des hypothèses à confirmer.

## Version Vercel

L'accueil redirige vers `/radar`. Cette page native fonctionne sans ChatGPT, sans iframe et sans MCP : choix du rayon (5–50 km), secteurs, recherche de cinq candidates et fiches officielles. `/api/radar` utilise l'API publique Recherche d'entreprises pour trouver les candidates ; les erreurs ne sont jamais remplacées par des données fictives. La recherche examine jusqu'à neuf pages et peut retourner moins de cinq candidates si les critères ne sont pas satisfaits. Cache mémoire borné de six heures, délai global de recherche de 45 secondes.

Quand l'utilisateur est connecté, le serveur relit les SIREN de son carnet privé avant chaque recherche (délai de huit secondes), puis écarte toutes ses pistes, quel que soit leur statut. Il cherche des remplaçantes avant de retenir jusqu'à cinq entreprises distinctes. Une lecture du carnet en erreur ne produit pas de sélection contenant potentiellement des doublons. Le cache mémoire tient compte des exclusions ; les réponses HTTP sont privées et non mises en cache. Aucun SIREN enregistré n'est ajouté à l'URL de recherche.

L'onglet Mes pistes utilise Supabase Auth et une base PostgreSQL protégée par RLS. Il permet d'enregistrer une entreprise, de modifier ses notes, son statut et sa prochaine action, puis d'exporter ses pistes. La connexion est réservée aux comptes explicitement autorisés. Sans configuration Supabase, la recherche reste disponible et l'interface indique que la sauvegarde n'est pas encore activée.

Le schéma et la procédure d'activation sont dans `supabase/`. D'après l'état du projet consigné le 10 septembre 2026, le compte propriétaire et les variables Vercel sont configurés ; la première connexion et la sauvegarde distante dans le navigateur restent à vérifier.

## Préparer le premier contact

Chaque candidate peut recevoir une fiche de recherche : indices cités avec liens, identité du site, contact professionnel publié, hypothèse à vérifier, partie de la démo à montrer et proposition de message à copier. Aucun message n'est envoyé. Une entreprise passe en priorité si son SIREN ou SIRET est retrouvé, si un indice lié au SAV ou au suivi est présent et si un moyen de contact est publié. Ce tri ne représente pas une probabilité de réponse.

`POST /api/radar/research` consulte au maximum six pages HTML du site, avec un délai de 42 secondes et un cache mémoire borné. Les liens de recrutement servent uniquement à repérer une annonce consultable, sans présumer qu'elle est encore ouverte. Les besoins internes, outils et budgets restent inconnus. Un nom et une ville concordants sont affichés comme une correspondance à confirmer ; un homonyme non identifié ne fournit ni indices attribués ni message. Les scripts, adresses privées et protocoles non web sont exclus.

La consultation d'un site saisi fonctionne sans fournisseur de recherche. La découverte automatique utilise Tavily, puis lit directement les sites proposés : les résumés du moteur ne servent pas de preuves. Elle est réservée aux membres Supabase autorisés. `GET /api/radar/research` expose seulement la disponibilité du service. Sans clé, l'interface propose de renseigner le site et indique clairement que l'automatisation reste à activer.

### Activation de la recherche automatique

1. Créer son compte et sa clé depuis [Tavily](https://app.tavily.com/). Définir le plafond d'usage dans son tableau de bord ; les limites en mémoire du radar ne sont pas un plafond global de facturation. La [documentation du moteur](https://docs.tavily.com/documentation/api-reference/endpoint/search) décrit l'appel utilisé.
2. Pour essayer localement, renseigner `TAVILY_API_KEY` dans `.env.local`, avec les deux paramètres publics Supabase de `.env.example`, puis redémarrer le serveur. Ne pas transmettre la clé dans une conversation ni la committer.
3. Lors de la mise en ligne autorisée, ajouter cette même variable serveur dans les paramètres Vercel du projet `romain-atelier-excel` (Production et Preview), puis reconstruire. Ne jamais ajouter le préfixe `NEXT_PUBLIC_` à la clé Tavily.
4. Appliquer la migration additionnelle `supabase/migrations/20260910_research_snapshot.sql` au projet Supabase pour enregistrer une nouvelle recherche sur une piste existante. Elle ajoute le droit de modifier le contenu de sa propre fiche, en conservant les règles RLS et les révisions ; elle ne modifie aucune ligne existante.
5. Connecté au compte autorisé, rechercher cinq entreprises avec l'option web cochée. Vérifier les sources, enregistrer une fiche, recharger et la relire dans Mes pistes. La fiche reste privée et les notes existantes sont conservées.

## Démonstration

`/demo/maison-martin` présente la vidéo Maison Martin en Full HD. L’ancienne route `/demo/reclamation` redirige vers cette vidéo ; les composants de l’ancienne démonstration sont conservés dans le dépôt mais ne sont plus proposés dans la navigation.

## Cockpit historique Sites

L'accueil conserve le cockpit « Premier client » et l'authentification ChatGPT dans l'environnement Sites. Les données historiques restent dans D1 ; cette adaptation ne les migre pas. Conserver le Site ChatGPT privé. `/vitrine` redirige vers l'accueil.

Le connecteur historique `/mcp` et sa prévisualisation `/radar-preview` restent dans le dépôt pour Sites. `/mcp` retourne 404 sur Vercel et n'est jamais appelé par le Radar natif. Les fixtures de prévisualisation ne sont jamais utilisées pour la recherche réelle.

## Développement

Node 22.13 ou supérieur ; `npm ci`, puis `npm run dev`. Pour reproduire le mode Vercel localement : `VERCEL=1 npm run dev`. Pour construire Vercel : `npm run build:vercel`. Les deux variables publiques Supabase figurent dans `.env.example`. Ne jamais exposer de clé `service_role` ou secrète.

Sous PowerShell : `$env:VERCEL='1'` puis `npm.cmd run dev`. Pour le build, arrêter ce serveur, définir `$env:NITRO_PRESET='vercel'` et `$env:UV_THREADPOOL_SIZE='1'`, puis lancer `npm.cmd exec vite build`. Ce dernier réglage évite les copies concurrentes de dépendances qui produisent EBUSY avec Nitro sur Windows. Le déploiement doit reconstruire les sources dans Vercel, sans téléverser directement ce paquet Windows.

Sous Windows, Vite surveille les fichiers par polling pour éviter qu'un fichier temporairement verrouillé fasse tomber le serveur. Les sorties `.vercel/` et les vérifications locales dans `work/` sont exclues de cette surveillance.

`npm run typecheck` vérifie les types ; `npm test` teste la recherche et les protections PostgreSQL localement. Les tests historiques du Worker/D1 restent séparés. Une vérification locale ne prouve pas que l'authentification, la sauvegarde distante ou le déploiement fonctionnent tant que le projet Supabase n'est pas configuré.
