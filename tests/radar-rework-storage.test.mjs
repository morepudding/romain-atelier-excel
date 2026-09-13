import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('Rework owner isolation, immutable history, duplicate import and optimistic saving', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const outsider = '00000000-0000-4000-8000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;`);
    for (const file of [
      '../supabase/schema.sql',
      '../supabase/migrations/20260913205521_radar_rework.sql',
    ])
      await db.exec(readFileSync(new URL(file, import.meta.url), 'utf8'));
    await db.query('insert into auth.users values ($1),($2),($3)', [
      alice,
      bob,
      outsider,
    ]);
    await db.query(
      'insert into public.radar_members(user_id) values ($1),($2)',
      [alice, bob],
    );
    const asUser = async (user, sql, params = []) => {
      await db.exec('begin; set local role authenticated;');
      try {
        await db.query("select set_config('request.jwt.claim.sub', $1, true)", [
          user,
        ]);
        const result = await db.query(sql, params);
        await db.exec('commit');
        return result;
      } catch (e) {
        await db.exec('rollback');
        throw e;
      }
    };
    const data = {
      name: 'Commerce témoin',
      decision: 'retained',
      site_state: 'unavailable',
      project_type: 'unknown',
      initial_assessment: 'Écarter',
      user_reason: 'Retenir',
    };
    const insert =
      'insert into public.radar_rework_projects(user_id,identity_key,data) values ($1,$2,$3) returning *';
    const {
      rows: [p],
    } = await asUser(alice, insert, [alice, 'web:temoin.fr', data]);
    assert.equal(p.revision, 1);
    assert.equal(
      (await asUser(alice, 'select * from public.radar_rework_versions')).rows
        .length,
      1,
    );
    assert.equal(
      (await asUser(bob, 'select * from public.radar_rework_projects')).rows
        .length,
      0,
    );
    assert.equal(
      (await asUser(bob, 'select * from public.radar_rework_versions')).rows
        .length,
      0,
    );
    await assert.rejects(
      asUser(outsider, insert, [outsider, 'web:autre.fr', data]),
      /row-level security/,
    );
    await assert.rejects(
      asUser(bob, insert, [alice, 'web:autre.fr', data]),
      /row-level security/,
    );
    await assert.rejects(
      asUser(alice, insert, [alice, 'web:temoin.fr', data]),
      /unique constraint/,
    );
    const save =
      'update public.radar_rework_projects set data=$1 where id=$2 and revision=$3 returning *';
    const changed = { ...data, user_reason: 'Garder le lieu, refaire le menu' };
    assert.equal(
      (await asUser(alice, save, [changed, p.id, 1])).rows[0].revision,
      2,
    );
    assert.equal((await asUser(alice, save, [data, p.id, 1])).rows.length, 0);
    assert.equal((await asUser(bob, save, [data, p.id, 2])).rows.length, 0);
    const history = (
      await asUser(
        alice,
        'select * from public.radar_rework_versions order by revision',
      )
    ).rows;
    assert.equal(history.length, 2);
    assert.deepEqual(history[0].data, data);
    assert.deepEqual(history[1].data, changed);
    await assert.rejects(
      asUser(
        alice,
        'update public.radar_rework_projects set user_id=$1 where id=$2',
        [bob, p.id],
      ),
      /permission denied/,
    );
    await assert.rejects(
      asUser(alice, 'update public.radar_rework_versions set data=$1', [data]),
      /permission denied/,
    );
    await assert.rejects(
      asUser(
        alice,
        'insert into public.radar_rework_versions(user_id,project_id,revision,data) values ($1,$2,99,$3)',
        [alice, p.id, data],
      ),
      /row-level security/,
    );
    await assert.rejects(
      asUser(alice, save, [{ ...data, decision: 'made_up' }, p.id, 2]),
      /check constraint/,
    );
    await db.exec('begin; set local role anon;');
    await assert.rejects(
      db.query('select * from public.radar_rework_projects'),
      /permission denied/,
    );
    await db.exec('rollback');
    await db.query('delete from public.radar_members where user_id=$1', [
      alice,
    ]);
    assert.equal(
      (await asUser(alice, 'select * from public.radar_rework_projects')).rows
        .length,
      0,
    );
    assert.equal(
      (await asUser(alice, 'select * from public.radar_rework_versions')).rows
        .length,
      0,
    );
  } finally {
    await db.close();
  }
});
