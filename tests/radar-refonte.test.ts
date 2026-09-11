import assert from 'node:assert/strict';
import test from 'node:test';
import {
  findRefonteTargets,
} from '../lib/radar/refonte-api.ts';
import {
  isRefonteTarget,
  mapRefonteTarget,
  rankRefonteTargets,
} from '../lib/radar/refonte-logic.ts';
import type { RawCompany } from '../lib/radar/types.ts';

const base: RawCompany = {
  siren: '123456789',
  nom_complet: 'ATELIER VENDEEN',
  etat_administratif: 'A',
  nature_juridique: '5710',
  section_activite_principale: 'G',
  activite_principale: '47.59B',
  tranche_effectif_salarie: '00',
  categorie_entreprise: 'MIC',
  nombre_etablissements_ouverts: 1,
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

const association: RawCompany = {
  ...base,
  siren: '987654321',
  nom_complet: 'ASSOCIATION CULTURE ET LIEN',
  nature_juridique: '9220',
  section_activite_principale: 'R',
  activite_principale: '90.01Z',
  tranche_effectif_salarie: '01',
};

void test('retient les petites entreprises et les associations', () => {
  assert.equal(isRefonteTarget(base), true);
  assert.equal(isRefonteTarget(association), true);
  assert.equal(
    mapRefonteTarget({ ...association, nature_juridique: '5195' })?.type,
    'Association',
  );
  assert.equal(mapRefonteTarget(association)?.type, 'Association');
  assert.equal(mapRefonteTarget(base)?.type, 'Entreprise');
});

void test('écarte les structures publiques, fermées et trop grandes', () => {
  assert.equal(
    isRefonteTarget({ ...base, categorie_entreprise: 'GE' }),
    false,
  );
  assert.equal(
    isRefonteTarget({ ...base, section_activite_principale: 'O' }),
    false,
  );
  assert.equal(
    isRefonteTarget({ ...base, nom_complet: 'MAIRIE DE VAIRE' }),
    false,
  );
  assert.equal(
    isRefonteTarget({ ...base, etat_administratif: 'C' }),
    false,
  );
  assert.equal(
    isRefonteTarget({ ...base, nombre_etablissements_ouverts: 101 }),
    false,
  );
});

void test('le classement est proche, déterministe et sans critères de site', () => {
  const targets = rankRefonteTargets(
    [
      { ...base, siren: '111111111', nom_complet: 'ENTREPRISE PROCHE' },
      association,
      { ...base, siren: '222222222', nom_complet: 'GRAND GROUPE', categorie_entreprise: 'GE' },
    ],
    { limit: 5, excludedSirens: [association.siren!] },
  );
  assert.deepEqual(
    targets.map((target) => target.siren),
    ['111111111'],
  );
  assert.equal('website' in targets[0], false);
  assert.equal('niveauPriorite' in targets[0], false);

  const diverse = rankRefonteTargets(
    [
      base,
      ...['333333333', '444444444', '555555555', '666666666'].map((siren) =>
        ({ ...base, siren }),
      ),
      {
        ...association,
        matching_etablissements: [
          {
            ...association.matching_etablissements![0],
            latitude: 46.7,
            longitude: -1.66,
          },
        ],
      },
    ],
    { limit: 5 },
  );
  assert.equal(diverse.some((target) => target.type === 'Association'), true);
});

void test('échantillonne des pages profondes pour trouver les deux types', async () => {
  const pages: string[] = [];
  const result = await findRefonteTargets(
    { radiusKm: 35, limit: 2 },
    {
      fetchImpl: async (input) => {
        const url = new URL(input instanceof Request ? input.url : input);
        pages.push(url.searchParams.get('page')!);
        return Response.json({
          total_results: 1250,
          results: pages.length === 1 ? [{ ...base, categorie_entreprise: 'PME' }, { ...base, siren: '222222222', categorie_entreprise: 'GE' }] : [association],
        });
      },
      sleepImpl: async () => {},
      now: () => new Date('2026-09-11T10:00:00Z'),
    },
  );

  assert.deepEqual(pages, ['1', '5']);
  assert.deepEqual(
    result.targets.map((target) => target.type),
    ['Association', 'Entreprise'],
  );
  assert.equal(result.examinedCount, 3);
  assert.equal(result.retrievedAt, '2026-09-11T10:00:00.000Z');
});
