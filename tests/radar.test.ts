import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fetchRadarPage, findLocalCompanies } from '../lib/radar/api.ts';
import { savedCompanySirens } from '../lib/radar/saved-companies.ts';
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

void test('écarte les SIREN enregistrés avant la limite et conserve les homonymes distincts', () => {
  const raw = Array.from({ length: 7 }, (_, index) => ({
    ...base,
    siren: `12345678${index}`,
  }));
  const companies = rankCompanies([raw[0], ...raw, raw[1]], {
    limit: 5,
    excludedSirens: [raw[0].siren],
  });
  assert.equal(companies.length, 5);
  assert.equal(new Set(companies.map((company) => company.siren)).size, 5);
  assert.equal(
    companies.some((company) => company.siren === raw[0].siren),
    false,
  );
  assert.equal(
    companies.every((company) => company.nom === base.nom_complet),
    true,
  );
});

void test('cherche des remplaçantes sur la page suivante quand les premières sont enregistrées', async () => {
  const known = Array.from({ length: 5 }, (_, index) => ({
    ...base,
    siren: `12345678${index}`,
  }));
  const fresh = Array.from({ length: 5 }, (_, index) => ({
    ...base,
    siren: `98765432${index}`,
  }));
  const pages: string[] = [];
  const result = await findLocalCompanies(
    { excludedSirens: known.map((company) => company.siren) },
    {
      fetchImpl: async (input) => {
        const page = new URL(
          input instanceof Request ? input.url : input,
        ).searchParams.get('page')!;
        pages.push(page);
        return Response.json({
          results: page === '1' ? known : [...known, ...fresh, fresh[0]],
          total_results: 500,
        });
      },
      sleepImpl: async () => {},
    },
  );
  assert.deepEqual(pages, ['1', '5']);
  assert.deepEqual(
    result.companies.map((company) => company.siren).sort(),
    fresh.map((company) => company.siren).sort(),
  );
});

void test('retourne zéro nouvelle entreprise si toutes les candidates disponibles sont enregistrées', async () => {
  const result = await findLocalCompanies(
    { excludedSirens: [base.siren!] },
    {
      fetchImpl: async () =>
        Response.json({ results: [base], total_results: 1 }),
    },
  );
  assert.deepEqual(result.companies, []);
});

void test('le cache distingue les carnets et normalise les exclusions', async (context) => {
  const raw = Array.from({ length: 7 }, (_, index) => ({
    ...base,
    siren: `12345678${index}`,
  }));
  let calls = 0;
  context.mock.method(globalThis, 'fetch', async () => {
    calls += 1;
    return Response.json({ results: raw, total_results: 7 });
  });
  const input = { radiusKm: 34, limit: 5 };
  const initial = await findLocalCompanies(input);
  const excludedSirens = initial.companies
    .slice(0, 2)
    .map((company) => company.siren);
  const fresh = await findLocalCompanies({ ...input, excludedSirens });
  assert.equal(fresh.companies.length, 5);
  assert.equal(
    fresh.companies.some((company) => excludedSirens.includes(company.siren)),
    false,
  );
  await findLocalCompanies({
    ...input,
    excludedSirens: [...excludedSirens.toReversed(), excludedSirens[0]],
  });
  assert.equal(calls, 2);
  assert.deepEqual(
    (await findLocalCompanies(input)).companies,
    initial.companies,
  );
});

void test('lit toutes les pistes du propriétaire et refuse de masquer une erreur de lecture', async () => {
  const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previousKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://radar-supabase.example.test';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'fixture-public-key';
  const userId = '11111111-2222-4333-8444-555555555555';
  const request = new Request('http://localhost/api/radar', {
    headers: { Authorization: 'Bearer fixture-token' },
  });
  try {
    assert.deepEqual(
      await savedCompanySirens(
        new Request('http://localhost/api/radar'),
        async () => {
          throw new Error('Aucun appel anonyme');
        },
      ),
      [],
    );
    const offsets: number[] = [];
    const sirens = await savedCompanySirens(request, async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : input);
      assert.equal(
        new Headers(init?.headers).get('authorization'),
        'Bearer fixture-token',
      );
      if (url.pathname === '/auth/v1/user')
        return Response.json({ id: userId });
      assert.equal(url.pathname, '/rest/v1/radar_leads');
      assert.equal(url.searchParams.get('select'), 'siren');
      assert.equal(url.searchParams.get('user_id'), `eq.${userId}`);
      assert.equal(url.searchParams.has('status'), false);
      const offset = Number(url.searchParams.get('offset'));
      offsets.push(offset);
      return Response.json(
        Array.from({ length: offset === 0 ? 1000 : 1 }, (_, i) => ({
          siren: String(offset + i).padStart(9, '0'),
        })),
      );
    });
    assert.equal(sirens.length, 1001);
    assert.deepEqual(offsets, [0, 1000]);
    await assert.rejects(
      savedCompanySirens(request, async (input) => {
        const url = new URL(input instanceof Request ? input.url : input);
        return url.pathname === '/auth/v1/user'
          ? Response.json({ id: userId })
          : Response.json({ message: 'Lecture impossible' }, { status: 400 });
      }),
      /Impossible de vérifier vos pistes/,
    );
    await assert.rejects(
      savedCompanySirens(request, async () =>
        Response.json({ message: 'Session invalide' }, { status: 401 }),
      ),
      /session a expiré/,
    );
  } finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl;
    if (previousKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = previousKey;
  }
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

void test('la recherche commence à la première page et s’arrête à la fin des résultats', async () => {
  const { findLocalCompanies } = await import('../lib/radar/api.ts');
  const pages: string[] = [];
  const result = await findLocalCompanies(
    { radiusKm: 5 },
    {
      fetchImpl: async (input) => {
        pages.push(
          new URL(
            input instanceof Request ? input.url : input,
          ).searchParams.get('page')!,
        );
        return Response.json({ results: [], total_results: 0 });
      },
      sleepImpl: async () => {},
    },
  );
  assert.deepEqual(pages, ['1']);
  assert.deepEqual(result.companies, []);
});

void test('un long Retry-After ne bloque pas la fonction Vercel', async () => {
  await assert.rejects(
    fetchRadarPage('https://example.test', {
      fetchImpl: async () =>
        new Response('', { status: 429, headers: { 'Retry-After': '120' } }),
      deadline: Date.now() + 5000,
      sleepImpl: async () => {
        throw new Error('Ne doit pas attendre');
      },
    }),
    /délai trop long/,
  );
});

void test('le formulaire refuse rayons et secteurs invalides', async () => {
  const { radarSearchInput } = await import('../lib/radar/search-input.ts');
  assert.equal(radarSearchInput.safeParse({ radiusKm: 0 }).success, false);
  assert.equal(radarSearchInput.safeParse({ radiusKm: 51 }).success, false);
  assert.equal(
    radarSearchInput.safeParse({ activitySections: [] }).success,
    false,
  );
  assert.equal(
    radarSearchInput.safeParse({ activitySections: ['X'] }).success,
    false,
  );
  assert.equal(
    radarSearchInput.safeParse({ radiusKm: '35', activitySections: ['C'] })
      .success,
    true,
  );
});
