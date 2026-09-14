begin;
-- Immutable, self-contained proposals. Only small IDs are stored in project history.
create table public.radar_rework_pages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null,
  slot text not null check (slot in ('a', 'b')),
  html text not null check (octet_length(html) between 30 and 8000000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$' and sha256 = encode(sha256(convert_to(html, 'UTF8')), 'hex')),
  created_at timestamptz not null default now(),
  foreign key (user_id, project_id) references public.radar_rework_projects(user_id, id) on delete cascade,
  unique (user_id, project_id, slot, sha256)
);
alter table public.radar_rework_pages enable row level security;
revoke all on public.radar_rework_pages from anon, authenticated;
grant select on public.radar_rework_pages to authenticated;
grant insert(user_id, project_id, slot, html, sha256) on public.radar_rework_pages to authenticated;
create policy rework_page_read on public.radar_rework_pages for select to authenticated using (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);
create policy rework_page_insert on public.radar_rework_pages for insert to authenticated with check (
  user_id = (select auth.uid()) and exists(select 1 from public.radar_members where user_id = (select auth.uid()))
);
-- References must resolve to this owner's matching project and direction.
create function public.radar_rework_check_pages() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare direction_slot text; page_id text;
begin
  foreach direction_slot in array array['a','b'] loop
    page_id := new.data->'pages'->>direction_slot;
    if coalesce(page_id, '') <> '' and not exists (
      select 1 from public.radar_rework_pages p where p.id::text = page_id
      and p.user_id = new.user_id and p.project_id = new.id and p.slot = direction_slot
    ) then raise exception 'Invalid proposal reference'; end if;
  end loop;
  return new;
end;
$$;
revoke all on function public.radar_rework_check_pages() from public, anon, authenticated;
create trigger radar_rework_check_pages before insert or update on public.radar_rework_projects
for each row execute function public.radar_rework_check_pages();
commit;
