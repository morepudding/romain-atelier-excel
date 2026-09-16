import test from 'node:test';
import assert from 'node:assert/strict';
import {
  identityKey,
  sameCompany,
  parseReworkImport,
  prepareRework,
  reworkDataSchema,
  safeUrl,
} from '../lib/radar/rework.ts';
import { reworkChatPrompt } from '../lib/radar/rework-chat.ts';

void test('reimport preserves human decisions, assistant assessment and unavailable sites', () => {
  const a = reworkDataSchema.parse({
    name: 'Atelier témoin',
    website: 'https://www.atelier-temoin.fr/',
    decision: 'retained',
    initial_assessment: 'Écarter',
    user_reason: 'À reprendre',
    site_state: 'unavailable',
  });
  const b = {
    ...a,
    website: 'http://atelier-temoin.fr/contact',
    decision: 'discarded',
  };
  const imported = parseReworkImport(
    JSON.stringify({ version: 1, projects: [{ data: a }, { data: b }] }),
  );
  assert.equal(imported.length, 1);
  assert.equal(imported[0].decision, 'retained');
  assert.equal(imported[0].initial_assessment, 'Écarter');
  assert.equal(imported[0].site_state, 'unavailable');
  assert.equal(imported[0].project_type, 'unknown');
  assert.equal(sameCompany(a, { ...a, siren: '123456789' }), true);
  assert.notEqual(
    identityKey({ ...a, website: 'https://facebook.com/atelier-a' }),
    identityKey({ ...a, website: 'https://facebook.com/atelier-b' }),
  );
});

void test('drafts use real observations, distinct directions and leave need unconfirmed', () => {
  const data = reworkDataSchema.parse({
    name: 'Atelier témoin',
    sector: 'craft',
    decision: 'retained',
    site_state: 'not_found',
    angle: 'Montrer les assemblages',
    observations: 'Menu peu lisible',
  });
  const result = prepareRework(data);
  assert.match(result.brief, /OBJECTIF À CONFIRMER/);
  assert.match(result.brief, /Vérifier l’existence d’un site propre/);
  assert.match(result.direction_a, /Menu peu lisible/);
  assert.match(result.direction_a, /Le trait juste/);
  assert.match(result.direction_b, /Matière vivante/);
  assert.equal(data.brief, '');
  assert.throws(() => prepareRework({ ...data, decision: 'discarded' }));
});

void test('imports reject unsafe links and incompatible shapes', () => {
  assert.equal(safeUrl('javascript:alert(1)'), null);
  assert.equal(safeUrl('https://user:password@example.com'), null);
  assert.throws(() =>
    reworkDataSchema.parse({
      name: 'Test',
      source_url: 'data:text/html,hello',
    }),
  );
  assert.throws(() => parseReworkImport('{"version":2,"projects":[]}'));
});

void test('the refonte chat prompt transfers context without pretending to create a chat or contact a prospect', () => {
  const project = {
    id: '00000000-0000-4000-8000-000000000001',
    user_id: '00000000-0000-4000-8000-000000000002',
    identity_key: 'name:atelier:vaire',
    revision: 2,
    created_at: '2026-09-16T10:00:00.000Z',
    updated_at: '2026-09-16T10:00:00.000Z',
    data: reworkDataSchema.parse({
      name: 'Atelier témoin',
      locality: 'Vairé',
      website: 'https://atelier.example/',
      source_url: 'https://annuaire.example/atelier',
      observations: 'Navigation peu lisible. Réservation difficile.',
      user_reason: 'À reprendre avec une entrée plus claire',
      decision: 'retained',
    }),
  };
  const prompt = reworkChatPrompt(project);
  assert.match(prompt, /Atelier témoin/);
  assert.match(prompt, /https:\/\/atelier\.example\//);
  assert.match(prompt, /une seule maquette interactive/);
  assert.match(prompt, /source documentaire/);
  assert.match(prompt, /Une image authentique mais médiocre doit être refusée/);
  assert.match(prompt, /trois premières secondes/);
  assert.match(prompt, /simple remise au propre du site actuel ne suffit pas/);
  assert.match(prompt, /Aucun prospect ne doit être contacté/);
  assert.match(prompt, /Décembre 2026 ne constitue pas une autorisation automatique/);
});
