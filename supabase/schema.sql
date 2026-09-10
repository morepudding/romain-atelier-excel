-- À appliquer dans le projet Supabase dédié à Radar local.
-- Aucun compte n'est autorisé automatiquement : l'administrateur ajoute son UUID
-- à radar_members après avoir créé le compte dans Supabase Auth.
begin;
create table public.radar_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.radar_members enable row level security;
revoke all on public.radar_members from anon, authenticated;
grant select on public.radar_members to authenticated;
create policy radar_member_self on public.radar_members for select to authenticated
  using (user_id = (select auth.uid()));

create table public.radar_leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  siren text not null check (siren ~ '^[0-9]{9}$'),
  company jsonb not null check (
    jsonb_typeof(company) = 'object'
    and company ?& array['siren', 'nom', 'commune', 'activiteLibelle', 'raisonSelection', 'workflowProbable']
    and company->>'siren' = siren
    and length(company->>'nom') between 1 and 500
    and octet_length(company::text) <= 20000
  ),
  status text not null default 'to_review'
    check (status in ('to_review', 'to_contact', 'contacted', 'meeting', 'paused')),
  notes text not null default '' check (length(notes) <= 10000),
  next_action text not null default '' check (length(next_action) <= 500),
  next_action_date date,
  source_retrieved_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  unique (user_id, siren)
);
create index radar_leads_owner_updated on public.radar_leads(user_id, updated_at desc);
alter table public.radar_leads enable row level security;
revoke all on public.radar_leads from anon, authenticated;
grant select on public.radar_leads to authenticated;
grant insert (user_id, siren, company, source_retrieved_at) on public.radar_leads to authenticated;
grant update (status, notes, next_action, next_action_date) on public.radar_leads to authenticated;
create policy radar_lead_read on public.radar_leads for select to authenticated using (
  user_id = (select auth.uid()) and exists (select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy radar_lead_insert on public.radar_leads for insert to authenticated with check (
  user_id = (select auth.uid()) and exists (select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy radar_lead_update on public.radar_leads for update to authenticated using (
  user_id = (select auth.uid()) and exists (select 1 from public.radar_members where user_id = (select auth.uid()))
) with check (
  user_id = (select auth.uid()) and exists (select 1 from public.radar_members where user_id = (select auth.uid()))
);

create function public.radar_lead_revision() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.revision := old.revision + 1;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
revoke all on function public.radar_lead_revision() from public, anon, authenticated;
create trigger radar_lead_revision before update on public.radar_leads
  for each row execute function public.radar_lead_revision();
commit;
