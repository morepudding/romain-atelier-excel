# Radar local — base privée

Le schéma `schema.sql` est prêt à appliquer dans un projet Supabase dédié. Il ne crée aucun compte et n'accorde automatiquement l'accès à personne. Il a été appliqué au projet `radar-local` (`tsgxdokkqzgglenjsaxr`, Paris) via la migration `radar_private_leads`. Le projet a été créé à 0 €/mois dans l’organisation confirmée par l’utilisateur. Les deux tables ont RLS activée et le contrôle de sécurité Supabase est sans anomalie. Aucun compte Auth ni membre autorisé n’existe encore.

## Activation

1. Effectué : organisation et coût confirmés ; projet dédié créé à Paris.
2. Effectué : migration `radar_private_leads` appliquée et contrôle de sécurité vérifié. Ne pas réappliquer le schéma.
3. Dans Supabase Auth, désactiver les inscriptions publiques et créer le compte du propriétaire avec son adresse confirmée. L'interface propose uniquement une connexion par mot de passe, aucune inscription.
4. Ajouter l'UUID réel de ce compte à `public.radar_members` depuis l'administration. Les utilisateurs ne peuvent pas s'ajouter eux-mêmes. Ne jamais utiliser une adresse ou un UUID supposé.
5. Configurer `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` dans Vercel puis reconstruire le site. Aucune clé secrète Supabase ou OpenAI n'est nécessaire dans l'application.
6. Tester une connexion réelle : rechercher, enregistrer une entreprise, recharger, modifier ses notes, vérifier depuis un second appareil et se déconnecter. Vérifier également les refus anonymes et les recommandations de sécurité sur le projet distant.

## Données et droits

`radar_members` autorise les comptes privés. `radar_leads` conserve la fiche publique à la date de recherche, son SIREN, le statut, les notes et la prochaine action. Les règles RLS imposent simultanément l'appartenance à la liste autorisée et la propriété de la ligne. Les droits SQL interdisent de changer le propriétaire ou de modifier cette liste depuis le navigateur.

Un SIREN ne peut être enregistré qu'une fois par propriétaire. La révision calculée par la base évite d'écraser une modification provenant d'un autre appareil. Un conflit conserve la saisie à l'écran et demande une actualisation. Le bouton Exporter permet de conserver une copie JSON des pistes ; aucun import automatique n'est implémenté.

La base D1 du cockpit historique est conservée. Aucune de ses données n'est migrée ou supprimée par cette adaptation ; les nouvelles pistes Radar constituent un carnet distinct.

## Vérification locale

`npm test` exécute les tests du Radar et le schéma PostgreSQL avec PGlite : lecture après écriture, droits anonymes, accès propriétaire, exclusion des comptes non autorisés, interdiction d'auto-autorisation, doublons et conflits de révision.

`node tests/radar-vercel-smoke.mjs`, après le build Vercel, vérifie aussi les routes du serveur généré (API publique simulée).

Ces tests locaux ne remplacent pas la validation de Supabase Auth et du projet distant après création.
