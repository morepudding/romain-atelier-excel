"""Generate guarded SQL for the signature Rework workflow; never connects to a database.
Run the resulting file through the authorized Supabase connector. Public assets live in Git.
"""
import argparse
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlsplit
from uuid import UUID, uuid4

WORKFLOW = 'signature-v1'
LEGACY_WORKFLOW = 'interactive-v1'
NOW = '(extract(epoch from now()) * 1000)::bigint'
TTL = 90 * 60 * 1000
MAX_ATTEMPTS = 6
APPROVAL_ACTIONS = {'approve-direction', 'approve-opening'}


def quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def obj(value):
    return quote(json.dumps(value, ensure_ascii=False)) + '::jsonb'


def base_scope(owner):
    return f"p.user_id='{owner}' and exists(select 1 from public.radar_members m where m.user_id=p.user_id)"


def project_scope(owner, project, revision):
    return f"""{base_scope(owner)} and p.id='{project}' and p.revision={revision}
      and p.data->>'decision'='retained' and coalesce(p.data->>'selected_direction','')=''
      and p.data->>'presentation'='single'"""


def read_metadata(path):
    meta = json.loads(path.read_text()) if path else {}
    if not isinstance(meta, dict):
        raise ValueError('metadata must be an object')
    limits = {
        'brief': 12000,
        'direction_a': 12000,
        'context': 14000,
        'source_commit': 40,
        'deployment_id': 100,
        'deployment_url': 1500,
        'prototype_url': 1500,
    }
    for key, value in meta.items():
        if key not in limits or not isinstance(value, str) or len(value) > limits[key]:
            raise ValueError('unsupported metadata field or size: ' + key)
    if meta.get('source_commit') and not re.fullmatch('[a-f0-9]{40}', meta['source_commit']):
        raise ValueError('source_commit must be a full SHA')
    for key in ('deployment_url', 'prototype_url'):
        if not meta.get(key):
            continue
        u = urlsplit(meta[key])
        if (u.scheme != 'https' or not u.hostname or
                not u.hostname.endswith('.vercel.app') or u.username or u.password):
            raise ValueError(key + ' must be an HTTPS Vercel URL without credentials')
    return meta


def build_approval(args, owner, project):
    scope = project_scope(owner, project, args.revision)
    if args.action == 'approve-direction':
        expected_status = 'awaiting_direction'
        expected_stage = 'direction_review'
        fields = "'status','queued','stage','opening_build','direction_approved_at',now()::text"
        missing = ''
    else:
        expected_status = 'awaiting_opening'
        expected_stage = 'opening_review'
        fields = "'status','queued','stage','production','opening_approved_at',now()::text"
        missing = " and coalesce(p.data#>>'{automation,direction_approved_at}','')<>''"
    guard = f"""{scope}
      and p.data#>>'{{automation,workflow}}'='{WORKFLOW}'
      and p.data#>>'{{automation,status}}'='{expected_status}'
      and p.data#>>'{{automation,stage}}'='{expected_stage}'{missing}"""
    return f"""begin;
do $$ begin
  perform 1 from public.radar_rework_projects p where {guard} for update;
  if not found then raise exception 'Étape modifiée ou déjà validée : relire le dossier'; end if;
end $$;
update public.radar_rework_projects p set data=p.data || jsonb_build_object('automation',
  p.data->'automation' || jsonb_build_object({fields},'lease','','lease_until',0,'error',''))
where {guard} returning p.id,p.revision,p.data;
commit;""", {}


def build(args):
    owner = str(args.owner)
    scope = base_scope(owner)
    workflows = f"('{LEGACY_WORKFLOW}','{WORKFLOW}')"
    pending = f"""{scope} and p.data->>'decision'='retained'
      and coalesce(p.data->>'selected_direction','')=''
      and p.data->>'presentation'='single'
      and p.data#>>'{{automation,workflow}}' in {workflows}
      and p.data#>>'{{automation,status}}' in ('queued','working')
      and coalesce(p.data#>>'{{automation,stage}}','research') in ('legacy','research','opening_build','production')
      and not (coalesce(p.data->>'interactive_url','')<>'' and
        (coalesce(p.data#>>'{{pages,a}}','')<>'' or coalesce(p.data#>>'{{images,a}}','')<>''))"""
    if args.action == 'claim':
        lease = str(args.lease or uuid4())
        sql = f"""begin;
select pg_advisory_xact_lock(hashtextextended('rework:{owner}',0));
update public.radar_rework_projects p set data=p.data || jsonb_build_object('automation',
  p.data->'automation' || jsonb_build_object('status','error','lease','','lease_until',0,
  'error','Six reprises interrompues. Reprenez la création depuis Radar.'))
where {pending} and coalesce((p.data#>>'{{automation,lease_until}}')::bigint,0)<={NOW}
  and coalesce((p.data#>>'{{automation,attempts}}')::int,0)>={MAX_ATTEMPTS};
with candidate as (
  select p.id from public.radar_rework_projects p where {pending}
  and coalesce((p.data#>>'{{automation,lease_until}}')::bigint,0)<={NOW}
  and coalesce((p.data#>>'{{automation,attempts}}')::int,0)<{MAX_ATTEMPTS}
  and not exists(select 1 from public.radar_rework_projects busy
    where busy.user_id='{owner}' and busy.data->>'decision'='retained'
    and coalesce(busy.data->>'selected_direction','')=''
    and busy.data#>>'{{automation,workflow}}' in {workflows}
    and busy.data#>>'{{automation,status}}'='working'
    and coalesce((busy.data#>>'{{automation,lease_until}}')::bigint,0)>{NOW})
  order by p.created_at,p.id limit 1 for update skip locked
)
update public.radar_rework_projects p set data=p.data || jsonb_build_object('automation',
  p.data->'automation' || jsonb_build_object('workflow','{WORKFLOW}','status','working','lease','{lease}',
  'stage',case when p.data#>>'{{automation,stage}}' in ('opening_build','production')
    then p.data#>>'{{automation,stage}}' else 'research' end,
  'lease_until',{NOW}+{TTL},'attempts',coalesce((p.data#>>'{{automation,attempts}}')::int,0)+1,
  'error','','artifact_path',coalesce(nullif(p.data#>>'{{automation,artifact_path}}',''),
    'public/maquettes/' || p.id || '/v' || (p.revision+1)::text)))
from candidate where p.id=candidate.id returning p.id,p.revision,p.data;
commit;"""
        return sql, {'lease': lease}

    if not args.project or not args.revision or args.revision < 1:
        raise ValueError('project and positive revision are required after claim')
    project = str(args.project)
    if args.action in APPROVAL_ACTIONS:
        return build_approval(args, owner, project)
    if not args.lease:
        raise ValueError('lease is required for this action')

    scope = project_scope(owner, project, args.revision)
    guard = f"""{scope}
      and p.data#>>'{{automation,workflow}}'='{WORKFLOW}'
      and p.data#>>'{{automation,status}}'='working'
      and p.data#>>'{{automation,lease}}'='{args.lease}'
      and (p.data#>>'{{automation,lease_until}}')::bigint>{NOW}"""
    parts = [f"""begin;
do $$ begin
  perform 1 from public.radar_rework_projects p where {guard} for update;
  if not found then raise exception 'Dossier modifié ou réservation expirée : relire avant reprise'; end if;
end $$;"""]
    meta = read_metadata(args.metadata)
    top = {k: v for k, v in meta.items() if k in ('brief', 'direction_a')}
    auto = {k: v for k, v in meta.items() if k not in top}
    auto.update(status='working', error='')
    extra_guard = ''
    ready_fields = ''
    time_fields = f", 'lease_until',{NOW}+{TTL}"

    if args.action == 'await-direction':
        auto.update(status='awaiting_direction', stage='direction_review', lease='', lease_until=0)
        time_fields = ''
        parts.insert(1, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}
  and coalesce((p.data || {obj(top)})->>'brief','')<>''
  and coalesce((p.data || {obj(top)})->>'direction_a','')<>'';
  if not found then raise exception 'Brief et direction sont requis avant validation'; end if;
end $$;""")
    elif args.action == 'await-opening':
        prototype = meta.get('prototype_url', '')
        if not prototype:
            raise ValueError('prototype_url is required before opening review')
        u = urlsplit(prototype)
        pattern = rf'/maquettes/{project}/v[1-9][0-9]*/prototype/index\.html'
        if (u.netloc != 'romain-atelier-excel.vercel.app' or u.query or u.fragment or
                not re.fullmatch(pattern, u.path)):
            raise ValueError('prototype_url must match the reserved Radar prototype folder')
        extra_guard = f" and p.data#>>'{{automation,artifact_path}}'={quote('public'+u.path.removesuffix('/prototype/index.html'))}"
        auto.update(status='awaiting_opening', stage='opening_review', lease='', lease_until=0)
        time_fields = ''
        parts.insert(1, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}{extra_guard}
  and p.data#>>'{{automation,stage}}'='opening_build'
  and coalesce(p.data#>>'{{automation,direction_approved_at}}','')<>''
  and (p.data->'automation' || {obj(auto)})->>'source_commit' ~ '^[a-f0-9]{{40}}$'
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_id','')<>''
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_url','')<>'';
  if not found then raise exception 'Prototype ou validation de direction manquante'; end if;
end $$;""")
    elif args.action == 'complete':
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
        auto.update(status='ready', stage='ready', lease='', lease_until=0,
                    model='ChatGPT Work / HTML interactif')
        extra_guard = f" and p.data#>>'{{automation,artifact_path}}'={quote('public'+u.path.removesuffix('/index.html'))}"
        ready_fields = " || jsonb_build_object('pages',jsonb_build_object('a'," + ref + ",'b',''))"
        time_fields = ", 'prepared_at',now()::text"
        parts.insert(1, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}
  and p.data#>>'{{automation,stage}}'='production'
  and coalesce(p.data#>>'{{automation,direction_approved_at}}','')<>''
  and coalesce(p.data#>>'{{automation,opening_approved_at}}','')<>'';
  if not found then raise exception 'Les deux validations humaines sont requises avant livraison'; end if;
end $$;""")
        parts.insert(2, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}{extra_guard};
  if not found then raise exception 'Chemin public incompatible avec le dossier réservé'; end if;
end $$;""")
        parts.insert(3, f"""do $$ begin
  perform 1 from public.radar_rework_projects p where {guard}
  and coalesce((p.data || {obj(top)})->>'brief','')<>''
  and coalesce((p.data || {obj(top)})->>'direction_a','')<>''
  and (p.data->'automation' || {obj(auto)})->>'source_commit' ~ '^[a-f0-9]{{40}}$'
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_id','')<>''
  and coalesce((p.data->'automation' || {obj(auto)})->>'deployment_url','')<>'';
  if not found then raise exception 'Brief, direction ou preuve de déploiement manquante'; end if;
end $$;""")
    elif args.action == 'fail':
        if not args.error or len(args.error) > 500:
            raise ValueError('provide a concise error (1..500 characters)')
        auto.update(status='error', error=args.error, lease='', lease_until=0)
        time_fields = ''

    parts.append(f"""update public.radar_rework_projects p set data=p.data || {obj(top)}{ready_fields}
  || jsonb_build_object('automation',p.data->'automation' || {obj(auto)} ||
    jsonb_build_object('workflow','{WORKFLOW}'{time_fields}))
where {guard}{extra_guard} returning p.id,p.revision,p.data;
commit;""")
    return '\n'.join(parts), {}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=[
        'claim', 'checkpoint', 'await-direction', 'approve-direction',
        'await-opening', 'approve-opening', 'complete', 'fail',
    ])
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
