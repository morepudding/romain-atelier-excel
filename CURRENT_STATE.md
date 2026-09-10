# État actuel

## En ligne

La PR #1 est fusionnée. Radar natif sans MCP publié sur https://romain-atelier-excel.vercel.app/radar. Le dépôt GitHub est désormais relié au projet Vercel ; les paramètres Supabase sont enregistrés en Production et Preview. Premier déploiement confirmé READY : a5490fe.

Projet Supabase `radar-local`, référence `tsgxdokkqzgglenjsaxr`, créé dans `morepudding’s Org`, région Paris, offre gratuite confirmée. Migration `radar_private_leads` appliquée ; RLS active sur les deux tables, audit sans anomalie. Aucun compte propriétaire créé ou autorisé.

## Vérifications et suite

Interface publique et formulaire de connexion vérifiés dans le navigateur. Le premier test réel a renvoyé zéro candidate : les premières pages contiennent surtout des grands groupes exclus par le classement. Correction 789f9c7 : filtrer les PME actives à la source avant pagination. Les 13 tests Radar passent ; vérifier le résultat réel après ce redéploiement.

Créer et autoriser le compte propriétaire, puis vérifier connexion, enregistrement et relecture sur la base distante. La sauvegarde privée ne doit pas être présentée comme prête tant que ce parcours n’est pas validé.

## Priorité

Finaliser Radar et sauvegarde privée. Les hypothèses commerciales restent à confirmer. Démo réclamation et cockpit historique Sites conservés. Aucun envoi de message ni migration des anciennes données D1.
