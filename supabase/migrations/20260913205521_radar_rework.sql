begin;
create table public.radar_rework_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  identity_key text not null check (length(identity_key) between 1 and 600),
  data jsonb not null check (
    jsonb_typeof(data) = 'object'
    and data ?& array['name','decision','site_state','project_type']
    and length(data->>'name') between 1 and 250
    and data->>'decision' in ('review','retained','discarded')
    and data->>'site_state' in ('unknown','existing','not_found','unavailable')
    and data->>'project_type' in ('unknown','refonte','creation')
    and octet_length(data::text) <= 100000
  ),
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, identity_key), unique(user_id, id)
);
create index radar_rework_owner_updated on public.radar_rework_projects(user_id, updated_at desc);
alter table public.radar_rework_projects enable row level security;
revoke all on public.radar_rework_projects from anon, authenticated;
grant select on public.radar_rework_projects to authenticated;
grant insert(user_id, identity_key, data) on public.radar_rework_projects to authenticated;
grant update(identity_key, data) on public.radar_rework_projects to authenticated;
create policy rework_read on public.radar_rework_projects for select to authenticated using (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy rework_insert on public.radar_rework_projects for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy rework_update on public.radar_rework_projects for update to authenticated using (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
) with check (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);

create table public.radar_rework_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  revision integer not null,
  data jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 100000),
  created_at timestamptz not null default now(),
  foreign key (user_id, project_id) references public.radar_rework_projects(user_id, id) on delete cascade,
  unique(project_id, revision)
);
create index radar_rework_versions_owner on public.radar_rework_versions(user_id, project_id, revision desc);
alter table public.radar_rework_versions enable row level security;
revoke all on public.radar_rework_versions from anon, authenticated;
grant select on public.radar_rework_versions to authenticated;
grant insert(user_id, project_id, revision, data) on public.radar_rework_versions to authenticated;
create policy rework_version_read on public.radar_rework_versions for select to authenticated using (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy rework_version_insert on public.radar_rework_versions for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_rework_projects p where p.id = radar_rework_versions.project_id and p.user_id = radar_rework_versions.user_id and p.revision = radar_rework_versions.revision and p.data = radar_rework_versions.data)
);
create function public.radar_rework_snapshot() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.radar_rework_versions(user_id, project_id, revision, data) values(new.user_id, new.id, new.revision, new.data);
  return new;
end;
$$;
revoke all on function public.radar_rework_snapshot() from public, anon, authenticated;
create trigger radar_rework_revision before update on public.radar_rework_projects for each row execute function public.radar_lead_revision();
create trigger radar_rework_snapshot after insert or update on public.radar_rework_projects for each row execute function public.radar_rework_snapshot();
commit;
