import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fetchRadarPage } from '../lib/radar/api.ts';
import { isExcluded, mapCompany, rankCompanies } from '../lib/radar/logic.ts';
import type { RawApiResponse, RawCompany } from '../lib/radar/types.ts';

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/radar-api.json', import.meta.url), 'utf8'),
) as RawApiResponse;

const base: RawCompany = {
  siren: '123456789',
  nom_complet: 'ATELIER VENDÉEN',
  etat_administratif: 'A',
  nature_juridique: '5710',
  section_activite_principale: 'C',
  activite_principale: '25.12Z',
  tranche_effectif_salarie: '12',
  categorie_entreprise: 'PME',
  nombre_etablissements_ouverts: 3,
  date_creation: '2004-01-01',
  matching_etablissements: [
    {
      etat_administratif: 'A',
      code_postal: '85150',
      libelle_commune: 'LES ACHARDS',
      latitude: 46.62,
      longitude: -1.66,
    },
  ],
};

void test('exclut les structures cessées, associations, EI et zéro salarié', () => {
  assert.equal(isExcluded({ ...base, etat_administratif: 'C' }), true);
  assert.equal(isExcluded({ ...base, nature_juridique: '9220' }), true);
  assert.equal(isExcluded({ ...base, nature_juridique: '1000' }), true);
  assert.equal(isExcluded({ ...base, tranche_effectif_salarie: '00' }), true);
});

void test('exclut l’écosystème nautique configuré', () => {
  assert.equal(isExcluded({ ...base, nom_complet: 'GROUPE BENETEAU' }), true);
  assert.equal(isExcluded({ ...base, nom_complet: 'SPBI' }), true);
  assert.equal(isExcluded({ ...base, activite_principale: '30.12Z' }), true);
});

void test('convertit la réponse API vers le schéma interne', () => {
  const company = mapCompany(base);
  assert.ok(company);
  assert.equal(company.siren, '123456789');
  assert.equal(company.commune, 'LES ACHARDS');
  assert.equal(company.trancheEffectif, '20 à 49 salariés');
  assert.match(company.sourceUrl, /123456789$/);
});

void test('le classement est déterministe et ne révèle pas le score', () => {
  const companies = rankCompanies([base, { ...base, siren: '123456780' }], {
    limit: 2,
  });
  assert.deepEqual(
    companies.map((company) => company.siren),
    ['123456780', '123456789'],
  );
  assert.equal('_score' in companies[0], false);
});

void test('les hypothèses restent prudentes', () => {
  const company = mapCompany(base);
  assert.ok(company);
  assert.doesNotMatch(company.workflowProbable, /a un problème/i);
  assert.match(
    company.workflowProbable,
    /Réclamations|non conformes|remplacement/,
  );
});

void test('limite le résultat final au nombre demandé', () => {
  const raw = Array.from({ length: 9 }, (_, index) => ({
    ...base,
    siren: `12345678${index}`,
  }));
  assert.equal(rankCompanies(raw, { limit: 5 }).length, 5);
});

void test('conserve un effectif inconnu si plusieurs établissements sont pertinents', () => {
  const company = mapCompany({
    ...base,
    tranche_effectif_salarie: 'NN',
    nombre_etablissements_ouverts: 4,
  });
  assert.ok(company);
  assert.equal(company.trancheEffectif, 'Effectif non communiqué');
});

void test('respecte Retry-After après une réponse 429', async () => {
  const waits: number[] = [];
  let calls = 0;
  const result = await fetchRadarPage('https://example.test/near_point', {
    fetchImpl: async () =>
      ++calls === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '2' } })
        : Response.json({ results: [base] }),
    sleepImpl: async (milliseconds) => {
      waits.push(milliseconds);
    },
  });
  assert.equal(calls, 2);
  assert.deepEqual(waits, [2000]);
  assert.equal(result.results?.length, 1);
});

void test('rejette une réponse invalide et accepte une réponse vide explicite', async () => {
  await assert.rejects(
    fetchRadarPage('https://example.test/near_point', {
      fetchImpl: async () => Response.json({ nope: true }),
    }),
    /réponse invalide/,
  );
  const empty = await fetchRadarPage('https://example.test/near_point', {
    fetchImpl: async () => Response.json({ results: [] }),
  });
  assert.deepEqual(empty.results, []);
});

void test('fixture réaliste: exclusions appliquées et cinq cartes produites', () => {
  const companies = rankCompanies(fixture.results || [], { limit: 5 });
  assert.equal(companies.length, 5);
  assert.equal(
    companies.some((company) => /BENETEAU|SPBI|JEANNEAU/i.test(company.nom)),
    false,
  );
  assert.equal(
    companies.every((company) => company.distanceKm <= 35),
    true,
  );
});
