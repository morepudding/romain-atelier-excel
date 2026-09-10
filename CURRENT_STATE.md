# État actuel

## En ligne

La PR #1 est fusionnée. Radar natif sans MCP publié sur https://romain-atelier-excel.vercel.app/radar. Dépôt GitHub relié au projet Vercel ; paramètres Supabase enregistrés en Production et Preview. Version applicative vérifiée : 436e467, déploiement dpl_2g2g8cxANpfmiAgmKqofCJuQwyZP.

Projet Supabase `radar-local`, référence `tsgxdokkqzgglenjsaxr`, créé dans `morepudding’s Org`, région Paris, offre gratuite confirmée. Migration `radar_private_leads` appliquée ; RLS active sur les deux tables, audit sans anomalie. Aucun compte propriétaire créé ou autorisé.

## Vérifications

Recherche réelle dans le navigateur : cinq entreprises affichées dans un rayon de 35 km autour de Vairé. Interface du carnet et formulaire de connexion présents, démonstration réclamation accessible. Quatorze tests passent, dont les protections PostgreSQL et la concurrence ; scénarios supplémentaires de pagination profonde et de dernière page testés.

L’API géographique ignore les filtres PME et état administratif : seuls les filtres d’activité sont appliqués à la source. Ces paramètres inutiles ont été retirés. Le radar échantillonne désormais des pages plus profondes pour dépasser les grands réseaux dominants ; les exclusions, le rayon et le classement sont appliqués localement. La recherche est une sélection non exhaustive, plafonnée par un délai global.

## À terminer

Créer et autoriser le compte propriétaire, puis vérifier connexion, enregistrement et relecture sur la base distante. La sauvegarde privée ne doit pas être présentée comme prête tant que ce parcours n’est pas validé.

## Priorité

Les hypothèses commerciales restent à confirmer. Démo réclamation et cockpit historique Sites conservés. Aucun envoi de message ni migration des anciennes données D1.
