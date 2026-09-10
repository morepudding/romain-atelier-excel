import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';

// Executes the actual PostgreSQL schema, grants and RLS policies locally.
// This does not claim to verify a deployed Supabase project or Supabase Auth.
test('private leads: ownership, membership, duplicates, persistence and concurrent edits', async () => {
  const db = new PGlite();
  const alice = '00000000-0000-4000-8000-000000000001';
  const bob = '00000000-0000-4000-8000-000000000002';
  const outsider = '00000000-0000-4000-8000-000000000003';
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to anon, authenticated;`);
    await db.exec(
      readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'),
    );
    await db.query('insert into auth.users(id) values ($1), ($2), ($3)', [
      alice,
      bob,
      outsider,
    ]);
    await db.query(
      'insert into public.radar_members(user_id) values ($1), ($2)',
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
      } catch (error) {
        await db.exec('rollback');
        throw error;
      }
    };
    const company = {
      siren: '123456789',
      nom: 'Entreprise de test',
      commune: 'Vairé',
      activiteLibelle: 'Industrie',
      raisonSelection: 'Test',
      workflowProbable: 'Hypothèse de test',
    };
    const insert =
      'insert into public.radar_leads(user_id,siren,company,source_retrieved_at) values ($1,$2,$3,now()) returning *';
    const {
      rows: [lead],
    } = await asUser(alice, insert, [alice, company.siren, company]);
    assert.equal(lead.revision, 1);
    assert.equal(
      (await asUser(alice, 'select * from public.radar_leads')).rows.length,
      1,
    );
    assert.equal(
      (await asUser(bob, 'select * from public.radar_leads')).rows.length,
      0,
    );
    assert.equal(
      (await asUser(outsider, 'select * from public.radar_leads')).rows.length,
      0,
    );
    await assert.rejects(
      asUser(outsider, insert, [outsider, company.siren, company]),
      /row-level security/,
    );
    await assert.rejects(
      asUser(bob, insert, [alice, company.siren, company]),
      /row-level security/,
    );
    await assert.rejects(
      asUser(alice, insert, [alice, company.siren, company]),
      /unique constraint/,
    );
    await assert.rejects(
      asUser(
        outsider,
        'insert into public.radar_members(user_id) values ($1)',
        [outsider],
      ),
      /permission denied/,
    );
    await assert.rejects(
      asUser(alice, 'update public.radar_leads set user_id=$1 where id=$2', [
        bob,
        lead.id,
      ]),
      /permission denied/,
    );
    const updated = await asUser(
      alice,
      'update public.radar_leads set notes=$1, status=$2 where id=$3 and revision=$4 returning *',
      ['À appeler', 'to_contact', lead.id, 1],
    );
    assert.equal(updated.rows[0].revision, 2);
    assert.equal(
      (
        await asUser(
          alice,
          'select notes from public.radar_leads where id=$1',
          [lead.id],
        )
      ).rows[0].notes,
      'À appeler',
    );
    const stale = await asUser(
      alice,
      'update public.radar_leads set notes=$1 where id=$2 and revision=$3 returning *',
      ['Ancienne saisie', lead.id, 1],
    );
    assert.equal(stale.rows.length, 0);
    assert.equal(
      (
        await asUser(
          bob,
          'update public.radar_leads set notes=$1 where id=$2 returning *',
          ['Intrusion', lead.id],
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      asUser(
        alice,
        "update public.radar_leads set status='invalid' where id=$1",
        [lead.id],
      ),
      /check constraint/,
    );
    await assert.rejects(
      asUser(alice, 'delete from public.radar_leads'),
      /permission denied/,
    );
    await db.query('delete from public.radar_members where user_id=$1', [
      alice,
    ]);
    assert.equal(
      (await asUser(alice, 'select * from public.radar_leads')).rows.length,
      0,
    );
    await db.exec('begin; set local role anon;');
    await assert.rejects(
      db.query('select * from public.radar_leads'),
      /permission denied/,
    );
    await db.exec('rollback');
  } finally {
    await db.close();
  }
});
