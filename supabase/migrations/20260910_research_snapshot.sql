-- Autorise la mise à jour du contenu d'une fiche, sous les RLS existantes.
-- Le propriétaire, le SIREN et les limites JSON restent protégés.
grant update (company) on public.radar_leads to authenticated;
