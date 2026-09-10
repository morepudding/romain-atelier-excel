# État actuel

## Vitrine — premier écran, 10 septembre 2026

La maquette autonome est dans `design/vitrine/`, avec une planche palette/typographies et deux captures de présentation. Elle présente des applications métier, assistants et agents IA, automatisations et formations. La composition conserve une apparition brève du « r. », un fond ivoire et un grand slider vert. Navigation, bouton de contact et introduction sont renforcés. Les vues d’application et d’assistant sont illustratives, avec des données fictives, en attendant les démonstrations de Romain.

Le premier écran reste une proposition à décliner après validation. Aucune route, donnée ou configuration de déploiement de l’application n’est modifiée. La version est préparée sur `feat/vitrine-direction` à la demande de Romain pour son envoi sur GitHub.

Vérifications effectuées sur les sources de la maquette : rendu à 1440 et 1100 px, slider au clic et au clavier, aperçu agrandi et fermeture par Échap, panneau de contact explicite et réduction des animations. Aucune erreur JavaScript ni requête échouée pendant ces contrôles. Syntaxe et lint du script vérifiés. La maquette HTML autonome ne nécessite pas de build de l’application.

## En ligne

La PR #1 est fusionnée. Radar natif sans MCP publié sur https://romain-atelier-excel.vercel.app/radar. Dépôt GitHub relié au projet Vercel ; paramètres Supabase enregistrés en Production et Preview. Version applicative vérifiée : 436e467, déploiement dpl_2g2g8cxANpfmiAgmKqofCJuQwyZP.

Projet Supabase `radar-local`, référence `tsgxdokkqzgglenjsaxr`, créé dans `morepudding’s Org`, région Paris, offre gratuite confirmée. Migration `radar_private_leads` appliquée ; RLS active sur les deux tables, audit sans anomalie. Compte propriétaire créé par l’utilisateur, adresse confirmée et accès ajouté à `radar_members` le 10 septembre 2026. Autorisation vérifiée en base ; lecture des pistes sous le rôle authenticated exécutée sans erreur.

## Vérifications

Recherche réelle dans le navigateur : cinq entreprises affichées dans un rayon de 35 km autour de Vairé. Interface du carnet et formulaire de connexion présents, démonstration réclamation accessible. Quatorze tests passent, dont les protections PostgreSQL et la concurrence ; scénarios supplémentaires de pagination profonde et de dernière page testés.

L’API géographique ignore les filtres PME et état administratif : seuls les filtres d’activité sont appliqués à la source. Ces paramètres inutiles ont été retirés. Le radar échantillonne désormais des pages plus profondes pour dépasser les grands réseaux dominants ; les exclusions, le rayon et le classement sont appliqués localement. La recherche est une sélection non exhaustive, plafonnée par un délai global.

## À terminer

Vérifier la première connexion du propriétaire dans le navigateur, puis l’enregistrement et la relecture d’une piste. Le compte et son autorisation sont en place ; le parcours complet de sauvegarde dans le navigateur reste à valider.

## Priorité

Les hypothèses commerciales restent à confirmer. Démo réclamation et cockpit historique Sites conservés. Aucun envoi de message ni migration des anciennes données D1.
