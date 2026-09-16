import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { PGlite } from '@electric-sql/pglite';

// Execute the actual generated SQL against the production schema, with no remote writes.
test('interactive worker claims once, resumes, protects human revisions and atomically attaches an immutable delivery', async () => {
  const db = new PGlite();
  const dir = mkdtempSync(join(tmpdir(), 'rework-worker-'));
  const owner = '00000000-0000-4000-8000-000000000001';
  const other = '00000000-0000-4000-8000-000000000002';
  const lease = '00000000-0000-4000-8000-000000000003';
  const lease2 = '00000000-0000-4000-8000-000000000004';
  const sql = (action, options = []) => {
    const output = join(dir, 'action.sql');
    execFileSync('python', [
      'scripts/rework-interactive.py',
      action,
      '--owner',
      owner,
      '--output',
      output,
      ...options,
    ]);
    return readFileSync(output, 'utf8');
  };
  const run = async (command) => {
    try {
      return await db.exec(command);
    } catch (error) {
      await db.exec('rollback');
      throw error;
    }
  };
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;`);
    for (const path of [
      'supabase/schema.sql',
      'supabase/migrations/20260913205521_radar_rework.sql',
      'supabase/migrations/20260914113321_radar_rework_pages.sql',
    ])
      await db.exec(readFileSync(path, 'utf8'));
    await db.query('insert into auth.users values ($1),($2)', [owner, other]);
    await db.query(
      'insert into public.radar_members(user_id) values ($1),($2)',
      [owner, other],
    );
    const queued = {
      name: 'Témoin',
      site_state: 'unknown',
      project_type: 'unknown',
      decision: 'retained',
      selected_direction: '',
      presentation: 'single',
      observations: 'Source privée',
      user_reason: 'Avis humain',
      automation: { workflow: 'interactive-v1', status: 'queued', attempts: 0 },
    };
    const insert = async (who, key, data) =>
      (
        await db.query(
          'insert into public.radar_rework_projects(user_id,identity_key,data) values($1,$2,$3) returning *',
          [who, key, data],
        )
      ).rows[0];
    const p = await insert(owner, 'name:premier', queued);
    const second = await insert(owner, 'name:second', queued);
    const otherProject = await insert(other, 'name:autre', queued);
    const read = async (id = p.id) =>
      (
        await db.query(
          'select * from public.radar_rework_projects where id=$1',
          [id],
        )
      ).rows[0];
    await run(sql('claim', ['--lease', lease]));
    let row = await read();
    assert.equal(row.revision, 2);
    assert.equal(row.data.automation.lease, lease);
    assert.equal(row.data.automation.workflow, 'signature-v1');
    assert.equal(row.data.automation.stage, 'research');
    const path = row.data.automation.artifact_path;
    assert.equal(path, `public/maquettes/${p.id}/v2`);
    await run(sql('claim', ['--lease', lease2]));
    assert.equal((await read()).revision, 2);
    assert.equal((await read(second.id)).data.automation.status, 'queued');
    assert.equal(
      (await read(otherProject.id)).data.automation.status,
      'queued',
    );
    const opts = (revision, token = lease) => [
      '--project',
      p.id,
      '--revision',
      String(revision),
      '--lease',
      token,
    ];
    const approvalOpts = (revision) => [
      '--project',
      p.id,
      '--revision',
      String(revision),
    ];
    await assert.rejects(
      run(sql('checkpoint', opts(2, lease2))),
      /réservation expirée/,
    );
    const metadata = join(dir, 'direction.json');
    writeFileSync(
      metadata,
      JSON.stringify({
        brief: "L'idée vérifiée",
        direction_a: 'Reflets',
        context: 'Direction présentée avant tout code.',
      }),
    );
    const preview = join(dir, 'preview.html');
    writeFileSync(
      preview,
      '<!doctype html><html><body>Aperçu fidèle au site public.</body></html>',
    );
    const url = `https://romain-atelier-excel.vercel.app/maquettes/${p.id}/v2/index.html`;
    await assert.rejects(
      run(sql('complete', [...opts(2), '--preview', preview, '--url', url])),
      /deux validations humaines/,
    );
    await run(sql('await-direction', [...opts(2), '--metadata', metadata]));
    row = await read();
    assert.equal(row.revision, 3);
    assert.equal(row.data.automation.status, 'awaiting_direction');
    assert.equal(row.data.automation.stage, 'direction_review');
    assert.equal(row.data.automation.lease, '');
    await assert.rejects(
      run(sql('approve-direction', approvalOpts(2))),
      /Étape modifiée/,
    );
    await run(sql('approve-direction', approvalOpts(3)));
    row = await read();
    assert.equal(row.revision, 4);
    assert.equal(row.data.automation.status, 'queued');
    assert.equal(row.data.automation.stage, 'opening_build');
    assert.ok(row.data.automation.direction_approved_at);

    await run(sql('claim', ['--lease', lease2]));
    row = await read();
    assert.equal(row.revision, 5);
    assert.equal(row.data.automation.stage, 'opening_build');
    const openingMetadata = join(dir, 'opening.json');
    writeFileSync(
      openingMetadata,
      JSON.stringify({
        prototype_url: `https://romain-atelier-excel.vercel.app/maquettes/${p.id}/v2/prototype/index.html`,
        source_commit: 'a'.repeat(40),
        deployment_id: 'dpl_opening',
        deployment_url: 'https://opening.vercel.app/',
      }),
    );
    await run(
      sql('await-opening', [
        ...opts(5, lease2),
        '--metadata',
        openingMetadata,
      ]),
    );
    row = await read();
    assert.equal(row.revision, 6);
    assert.equal(row.data.automation.status, 'awaiting_opening');
    assert.equal(row.data.automation.stage, 'opening_review');
    assert.equal(
      row.data.automation.prototype_url,
      `https://romain-atelier-excel.vercel.app/maquettes/${p.id}/v2/prototype/index.html`,
    );
    await run(sql('approve-opening', approvalOpts(6)));
    row = await read();
    assert.equal(row.revision, 7);
    assert.equal(row.data.automation.status, 'queued');
    assert.equal(row.data.automation.stage, 'production');
    assert.ok(row.data.automation.opening_approved_at);

    await run(sql('claim', ['--lease', lease]));
    row = await read();
    assert.equal(row.revision, 8);
    assert.equal(row.data.automation.stage, 'production');
    const finalMetadata = join(dir, 'final.json');
    writeFileSync(
      finalMetadata,
      JSON.stringify({
        source_commit: 'b'.repeat(40),
        deployment_id: 'dpl_final',
        deployment_url: 'https://final.vercel.app/',
      }),
    );
    await run(
      sql('checkpoint', [
        ...opts(8),
        '--metadata',
        finalMetadata,
      ]),
    );
    row = await read();
    assert.equal(row.revision, 9);
    await assert.rejects(
      run(
        sql('complete', [
          ...opts(9),
          '--preview',
          preview,
          '--url',
          url.replace('/v2/', '/v99/'),
        ]),
      ),
      /Chemin public/,
    );
    assert.equal(
      (await db.query('select * from public.radar_rework_pages')).rows.length,
      0,
    );
    // Human edit wins; the stale lease result must not attach anything.
    await db.query(
      'update public.radar_rework_projects set data=data || \'{"user_reason":"Dernier avis humain"}\'::jsonb where id=$1',
      [p.id],
    );
    await assert.rejects(
      run(sql('complete', [...opts(9), '--preview', preview, '--url', url])),
      /Dossier modifié/,
    );
    assert.equal(
      (await db.query('select * from public.radar_rework_pages')).rows.length,
      0,
    );
    // After rereading an unrelated edit, complete using the current revision and the same valid lease.
    row = await read();
    await run(
      sql('complete', [
        ...opts(row.revision),
        '--preview',
        preview,
        '--url',
        url,
      ]),
    );
    row = await read();
    assert.equal(row.data.automation.status, 'ready');
    assert.equal(row.data.automation.stage, 'ready');
    assert.equal(row.data.selected_direction, '');
    assert.equal(row.data.user_reason, 'Dernier avis humain');
    assert.equal(row.data.observations, 'Source privée');
    assert.equal(row.data.interactive_url, url);
    assert.equal(row.data.pages.b, '');
    assert.equal(
      (
        await db.query(
          "select sha256=encode(sha256(convert_to(html,'UTF8')),'hex') as matches from public.radar_rework_pages",
        )
      ).rows[0].matches,
      true,
    );
    await assert.rejects(
      run(
        sql('complete', [
          ...opts(row.revision),
          '--preview',
          preview,
          '--url',
          url,
        ]),
      ),
      /réservation expirée/,
    );
    assert.equal(
      (await db.query('select * from public.radar_rework_pages')).rows.length,
      1,
    );
    await run(sql('claim', ['--lease', lease2]));
    let next = await read(second.id);
    const savedPath = next.data.automation.artifact_path;
    await db.query(
      "update public.radar_rework_projects set data=jsonb_set(data,'{automation,lease_until}','0') where id=$1",
      [second.id],
    );
    await run(sql('claim', ['--lease', lease]));
    next = await read(second.id);
    assert.equal(next.data.automation.attempts, 2);
    assert.equal(next.data.automation.artifact_path, savedPath);
    await db.query(
      "update public.radar_rework_projects set data=jsonb_set(jsonb_set(data,'{automation,lease_until}','0'),'{automation,attempts}','6') where id=$1",
      [second.id],
    );
    await run(sql('claim', ['--lease', lease2]));
    assert.equal((await read(second.id)).data.automation.status, 'error');
    assert.equal((await read(otherProject.id)).revision, 1);
    assert.equal((await read()).data.automation.status, 'ready');
  } finally {
    await db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
