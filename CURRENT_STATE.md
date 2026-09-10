# État actuel

## Archive du film Maison Martin — 10 septembre 2026

Le film validé par Romain est conservé dans `films/maison-martin/`, sous le tag `maison-martin-v1.0.0`. L’archive comprend le MP4 Full HD de 60 secondes, ses deux images de chantier fictives, les scripts d’animation et de son, ainsi que les instructions de rendu et les mesures de vérification. Publication du tag dans le dépôt de la vitrine ; la branche applicative reste à sa version existante.

Contrôles : MP4 identique au fichier validé par son SHA-256, décodage des 1 800 images réussi, 120 images finales stables, installation des dépendances du rendu et essai d’encodage de deux secondes réussis. Les sources archivées utilisent un chemin FFmpeg configurable et le gain du mixage final. Les fichiers de l’application ne sont pas modifiés par cette archive.

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
