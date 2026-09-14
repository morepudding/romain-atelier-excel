# Livraison des propositions Rework

Le résultat utilisateur est une comparaison A/B visible dans `/radar/rework`, onglet « Propositions à choisir ». Un lien scratch, une référence Library ou un brief seul ne termine pas une livraison.

Le lecteur accepte `data.pages.a/b` (UUID dans `radar_rework_pages`) et les anciens chemins `data.images.a/b`. Les pages autonomes HTML/CSS et leurs images data: sont stockées dans la table privée, jamais dans le dépôt public. Le navigateur les rend dans une iframe isolée sans scripts, accès au parent, formulaires ou ressources réseau. Garder styles et photos intégrés et compresser les images (8 Mo maximum par page). Les ancres de page fonctionnent ; aucune transaction/contact n'est exécutée par l'aperçu.

L'agent autorisé lit le propriétaire, le dossier, sa révision, la décision et les références existantes. Il conserve les versions déjà livrées et reprend les étapes manquantes. Après les contrôles visuels, il génère l'import avec :

```sh
python scripts/rework-import-pages.py --owner UUID --project UUID --revision N --a proposition-a.html --b proposition-b.html --output /tmp/import-rework.sql
```

Exécuter ce SQL exact via Supabase `execute_sql` sur le projet autorisé. Ne pas l'afficher dans la réponse. La transaction verrouille et vérifie la révision ainsi que l'absence de choix humain, insère les pages de façon idempotente par empreinte SHA-256, puis attache les deux UUID et le statut. Elle préserve les autres données ; les triggers créent la version. Une révision concurrente provoque un échec et impose une relecture, jamais un écrasement.

Relire `pages`, `selected_direction`, `revision` et, pour chaque UUID, le propriétaire, dossier, slot, longueur et empreinte réelle de `html`. Vérifier la présence des deux pages dans l'historique. Contrôler si possible leur chargement dans le Radar connecté et le passage ordinateur/mobile. Mentionner précisément tout contrôle qui manque. En cas de blocage du navigateur, garder la livraison en base et poursuivre les contrôles disponibles ; ne prétendre ni avoir vu le rendu ni avoir testé la connexion personnelle.

Si un import échoue, résoudre le problème accessible et réessayer uniquement la partie manquante. Ne pas annoncer « intégré » si seuls des fichiers annexes existent. La tâche ne doit ni appeler `/api/radar/rework/prepare` ni acheter du crédit IA ; le fournisseur payant est désactivé par défaut. Les corrections utilisateur vident les références courantes, conservent les pages historiques et inscrivent leur consigne dans `automation.instruction`.
