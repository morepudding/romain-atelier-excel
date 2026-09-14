"""Generate guarded SQL for the interactive Rework agent; never connects to a database.
Run the resulting file through the authorized Supabase connector. Public assets live in Git.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID, uuid4

WORKFLOW = 'interactive-v1'
NOW = '(extract(epoch from now()) * 1000)::bigint'
TTL = 90 * 60 * 1000


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def obj(value):
    return quote(json.dumps(value, ensure_ascii=False)) + '::jsonb'


def build(args):
    owner = str(args.owner)
    scope = f"p.user_id='{owner}' and exists(select 1 from public.radar_members m where m.user_id=p.user_id)"
    pending = f"""{scope} and p.data->>'decision'='retained'
      and coalesce(p.data->>'selected_direction','')=''
      and p.data->>'presentation'='single'
      and p.data#>>'{{automation,workflow}}'='{WORKFLOW}'
      and p.data#>>'{{automation,status}}' in ('queued','working')
      and not (coalesce(p.data->>'interactive_url','')<>'' and
        (coalesce(p.data#>>'{{pages,a}}','')<>'' or coalesce(p.data#>>'{{images,a}}','')<>''))"""
    if args.action == 'claim':
        lease = str(args.lease or uuid4())
        # Serialize claims for this owner; an active run blocks another job in the same queue.
        sql = f"""begin;
select pg_advisory_xact_lock(hashtextextended('rework:{owner}',0));
update public.radar_rework_projects p set data=p.data || jsonb_build_object('automation',
  p.data->'automation' || jsonb_build_object('status','error','lease','','lease_until',0,
  'error','Trois tentatives interrompues. Reprenez la création depuis Radar.'))
where {pending} and coalesce((p.data#>>'{{automation,lease_until}}')::bigint,0)<={NOW}
  and coalesce((p.data#>>'{{automation,attempts}}')::int,0)>=3;
with candidate as (
  select p.id from public.radar_rework_projects p where {pending}
  and coalesce((p.data#>>'{{automation,lease_until}}')::bigint,0)<={NOW}
  and coalesce((p.data#>>'{{automation,attempts}}')::int,0)<3
  and not exists(select 1 from public.radar_rework_projects busy
    where busy.user_id='{owner}' and busy.data->>'decision'='retained'
    and coalesce(busy.data->>'selected_direction','')=''
    and busy.data#>>'{{automation,workflow}}'='{WORKFLOW}'
    and busy.data#>>'{{automation,status}}'='working'
    and coalesce((busy.data#>>'{{automation,lease_until}}')::bigint,0)>{NOW})
  order by p.created_at,p.id limit 1 for update skip locked
)
update public.radar_rework_projects p set data=p.data || jsonb_build_object('automation',
  p.data->'automation' || jsonb_build_object('status','working','lease','{lease}',
  'lease_until',{NOW}+{TTL},'attempts',coalesce((p.data#>>'{{automation,attempts}}')::int,0)+1,
  'error','','artifact_path',coalesce(nullif(p.data#>>'{{automation,artifact_path}}',''),
    'public/maquettes/' || p.id || '/v' || (p.revision+1)::text)))
from candidate where p.id=candidate.id returning p.id,p.revision,p.data;
commit;"""
        return sql, {'lease': lease}

    if not args.project or not args.lease or not args.revision or args.revision < 1:
        raise ValueError('project, lease and positive revision are required after claim')
    project = str(args.project)
    guard = f"""{scope} and p.id='{project}' and p.revision={args.revision}
      and p.data->>'decision'='retained' and coalesce(p.data->>'selected_direction','')=''
      and p.data->>'presentation'='single'
      and p.data#>>'{{automation,workflow}}'='{WORKFLOW}'
      and p.data#>>'{{automation,status}}'='working'
      and p.data#>>'{{automation,lease}}'='{args.lease}'
      and (p.data#>>'{{automation,lease_until}}')::bigint>{NOW}"""
    parts = [f"""begin;
do $$ begin
  perform 1 from public.radar_rework_projects p where {guard} for update;
  if not found then raise exception 'Dossier modifié ou réservation expirée : relire avant reprise'; end if;
end $$;"""]
    meta = json.loads(args.metadata.read_text()) if args.metadata else {}
    if not isinstance(meta, dict):
        raise ValueError('metadata must be an object')
    limits = {'brief': 12000, 'direction_a': 12000, 'context': 14000,
              'source_commit': 40, 'deployment_id': 100, 'deployment_url': 1500}
    for key, value in meta.items():
        if key not in limits or not isinstance(value, str) or len(value) > limits[key]:
            raise ValueError('unsupported metadata field or size: ' + key)
    if meta.get('source_commit') and not re.fullmatch('[a-f0-9]{40}', meta['source_commit']):
        raise ValueError('source_commit must be a full SHA')
    if meta.get('deployment_url'):
        u = urlsplit(meta['deployment_url'])
        if u.scheme != 'https' or not u.hostname or not u.hostname.endswith('.vercel.app') or u.username or u.password:
            raise ValueError('deployment_url must be an HTTPS Vercel URL without credentials')
    top = {k: v for k, v in meta.items() if k in ('brief', 'direction_a')}
    auto = {k: v for k, v in meta.items() if k not in top}
    auto.update(status='working', error='')
    extra_guard = ''
    if args.action == 'complete':
        if not args.preview or not args.url:
            raise ValueError('preview and url are required for completion')
        u = urlsplit(args.url)
        pattern = rf'/maquettes/{project}/v[1-9][0-9]*/index\.html'
        if (u.scheme != 'https' or u.netloc != 'romain-atelier-excel.vercel.app'
                or u.query or u.fragment or not re.fullmatch(pattern, u.path)):
            raise ValueError('url must match the immutable dossier folder on Radar Vercel')
        payload = args.preview.read_bytes()
        if not 30 <= len(payload) <= 8000000:
            raise ValueError('preview must be between 30 bytes and 8 MB')
        html = payload.decode('utf-8')
        digest = hashlib.sha256(payload).hexdigest()
        parts.append(f"""insert into public.radar_rework_pages(user_id,project_id,slot,html,sha256)
values ('{owner}','{project}','a',{quote(html)},'{digest}')
on conflict(user_id,project_id,slot,sha256) do nothing;""")
        ref = f"(select id::text from public.radar_rework_pages where user_id='{owner}' and project_id='{project}' and slot='a' and sha256='{digest}')"
        top.update(interactive_url=args.url, presentation='single', direction_b='')
        auto.update(status='ready', lease='', lease_until=0, model='ChatGPT Work / HTML interactif')
        # Ensure the public page belongs to this run's reserved immutable folder.
        extra_guard = f" and p.data#>>'{{automation,artifact_path}}'={quote('public'+u.path.removesuffix('/index.html'))}"
        ready_fields = " || jsonb_build_object('pages',jsonb_build_object('a'," + ref + ",'b',''))"
        time_fields = ", 'prepared_at',now()::text"
    elif args.action == 'fail':
        if not args.error or len(args.error) > 500:
            raise ValueError('provide a concise error (1..500 characters)')
        auto.update(status='error', error=args.error, lease='', lease_until=0)
        ready_fields = ''
        time_fields = ''
    else:
        ready_fields = ''
        time_fields = f", 'lease_until',{NOW}+{TTL}"
    if args.action == 'complete':
        # Reject mismatched paths before inserting an immutable cover, with a clear error.
        parts.insert(1, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}{extra_guard};
  if not found then raise exception 'Chemin public différent du dossier réservé'; end if;
end $$;""")
        parts.insert(2, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}
  and coalesce((p.data || {obj(top)})->>'brief','')<>''
  and coalesce((p.data || {obj(top)})->>'direction_a','')<>''
  and (p.data->'automation' || {obj(auto)})->>'source_commit' ~ '^[a-f0-9]{{40}}$'
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_id','')<>''
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_url','')<>'';
  if not found then raise exception 'Brief, direction ou preuve de déploiement manquante'; end if;
end $$;""")
    parts.append(f"""update public.radar_rework_projects p set data=p.data || {obj(top)}{ready_fields}
  || jsonb_build_object('automation',p.data->'automation' || {obj(auto)} ||
    jsonb_build_object('workflow','{WORKFLOW}'{time_fields}))
where {guard}{extra_guard} returning p.id,p.revision,p.data;
commit;""")
    return '\n'.join(parts), {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['claim', 'checkpoint', 'complete', 'fail'])
    parser.add_argument('--owner', required=True, type=UUID)
    parser.add_argument('--project', type=UUID)
    parser.add_argument('--revision', type=int)
    parser.add_argument('--lease', type=UUID)
    parser.add_argument('--metadata', type=Path)
    parser.add_argument('--preview', type=Path)
    parser.add_argument('--url')
    parser.add_argument('--error')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    sql, extra = build(args)
    args.output.write_text(sql, encoding='utf-8')
    print(json.dumps({'sql': str(args.output), **extra}))


if __name__ == '__main__':
    main()
