"""Build an atomic SQL import for two self-contained private Rework proposals.
Execute the generated SQL using the authorized Supabase connector, not Storage.
"""
import argparse
import hashlib
import json
from pathlib import Path
from uuid import UUID

parser = argparse.ArgumentParser()
parser.add_argument('--owner', required=True, type=UUID)
parser.add_argument('--project', required=True, type=UUID)
parser.add_argument('--revision', required=True, type=int)
parser.add_argument('--a', required=True, type=Path)
parser.add_argument('--b', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()

def quote(value):
    return "'" + str(value).replace("'", "''") + "'"

parts = [f"""begin;
do $$ begin
  perform 1 from public.radar_rework_projects p
  where p.id='{args.project}' and p.user_id='{args.owner}' and p.revision={args.revision}
  and p.data->>'decision'='retained' and coalesce(p.data->>'selected_direction','')=''
  and exists(select 1 from public.radar_members m where m.user_id=p.user_id)
  for update;
  if not found then raise exception 'Dossier modifié ou non autorisé : relire avant import'; end if;
end $$;"""]
refs = {}
for slot, path in [('a',args.a), ('b',args.b)]:
    html = path.read_text(encoding='utf-8')
    payload = html.encode('utf-8')
    if not 30 <= len(payload) <= 8000000:
        raise ValueError('Each HTML page must be between 30 bytes and 8 MB')
    checksum = hashlib.sha256(payload).hexdigest()
    refs[slot] = f"(select id::text from public.radar_rework_pages where user_id='{args.owner}' and project_id='{args.project}' and slot='{slot}' and sha256='{checksum}')"
    parts.append(f"insert into public.radar_rework_pages(user_id,project_id,slot,html,sha256) values ('{args.owner}','{args.project}','{slot}',{quote(html)},'{checksum}') on conflict(user_id,project_id,slot,sha256) do nothing;")
parts.append(f"""update public.radar_rework_projects set data = data || jsonb_build_object(
  'pages',jsonb_build_object('a',{refs['a']},'b',{refs['b']}),
  'automation', coalesce(data->'automation','{{}}'::jsonb) || jsonb_build_object('status','ready','model','ChatGPT Work / HTML','lease','','lease_until',0,'error','','prepared_at',now()::text)
) where id='{args.project}' and user_id='{args.owner}' and revision={args.revision}
returning id,revision,data->'pages' as pages,data->>'selected_direction' as selected_direction;
commit;""")
args.output.write_text('\n'.join(parts), encoding='utf-8')
print(json.dumps({'sql':str(args.output),'bytes':args.output.stat().st_size}))
