// Run after npm run build:vercel. Tests the generated Vercel fetch handler.
// Public enterprise API is stubbed; this is not a live external-API test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.VERCEL = '1';
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/radar-api.json', import.meta.url), 'utf8'),
);
const originalFetch = globalThis.fetch;
const testUserId = '11111111-2222-4333-8444-555555555555';
let savedSirens = [];
let savedReadFails = false;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname === 'recherche-entreprises.api.gouv.fr')
    return Response.json(fixture);
  if (url.pathname === '/auth/v1/user') {
    return new Headers(init?.headers).get('authorization') ===
      'Bearer fixture-radar-session'
      ? Response.json({ id: testUserId })
      : Response.json({ message: 'Session de test invalide' }, { status: 401 });
  }
  if (url.pathname === '/rest/v1/radar_leads') {
    assert.equal(url.searchParams.get('user_id'), `eq.${testUserId}`);
    assert.equal(url.searchParams.get('select'), 'siren');
    return savedReadFails
      ? Response.json({ message: 'Lecture indisponible' }, { status: 400 })
      : Response.json(savedSirens.map((siren) => ({ siren })));
  }
  return originalFetch(input, init);
};
try {
  const { default: app } =
    await import('../.vercel/output/functions/__server.func/index.mjs');
  const request = (path) => app.fetch(new Request(`http://localhost${path}`));
  const home = await request('/');
  assert.ok([302, 307, 308].includes(home.status));
  assert.equal(home.headers.get('location'), '/radar');
  const radar = await request('/radar');
  assert.equal(radar.status, 200);
  const html = await radar.text();
  assert.match(html, /Trouver 5 entreprises/);
  assert.match(html, /Mes pistes/);
  assert.doesNotMatch(html, /<iframe/);
  const bad = await request('/api/radar?radiusKm=51');
  assert.equal(bad.status, 400);
  const search = await request('/api/radar?radiusKm=35&sections=C,F,G,H,I,L,N');
  assert.equal(search.status, 200);
  assert.equal((await search.json()).companies.length, 5);
  const service = await request('/api/radar/research');
  assert.equal(service.status, 200);
  assert.equal(
    typeof (await service.json()).automaticSearchAvailable,
    'boolean',
  );
  const companies = await (
    await request('/api/radar?radiusKm=35&sections=C,F,G,H,I,L,N')
  ).json();
  const ownSearch = () =>
    app.fetch(
      new Request(
        'http://localhost/api/radar?radiusKm=35&sections=C,F,G,H,I,L,N',
        {
          headers: { Authorization: 'Bearer fixture-radar-session' },
        },
      ),
    );
  savedSirens = companies.companies.slice(0, 2).map((company) => company.siren);
  const freshSearch = await ownSearch();
  assert.equal(freshSearch.status, 200);
  assert.equal(freshSearch.headers.get('cache-control'), 'private, no-store');
  const freshCompanies = (await freshSearch.json()).companies;
  assert.ok(freshCompanies.length > 0);
  assert.equal(
    freshCompanies.some((company) => savedSirens.includes(company.siren)),
    false,
  );
  savedSirens.push(freshCompanies[0].siren);
  const refreshed = (await (await ownSearch()).json()).companies;
  assert.equal(
    refreshed.some((company) => savedSirens.includes(company.siren)),
    false,
  );
  savedReadFails = true;
  const failedRead = await ownSearch();
  assert.equal(failedRead.status, 503);
  assert.match((await failedRead.json()).error, /vérifier vos pistes/);
  savedReadFails = false;
  const expired = await app.fetch(
    new Request('http://localhost/api/radar', {
      headers: { Authorization: 'Bearer fixture-expired' },
    }),
  );
  assert.equal(expired.status, 401);
  assert.deepEqual(
    (
      await (
        await request('/api/radar?radiusKm=35&sections=C,F,G,H,I,L,N')
      ).json()
    ).companies,
    companies.companies,
  );
  const postResearch = (body, headers = {}) =>
    app.fetch(
      new Request('http://localhost/api/radar/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      }),
    );
  assert.equal(
    (
      await postResearch({
        company: companies.companies[0],
        website: 'http://127.0.0.1/private',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await postResearch(
        { company: companies.companies[0] },
        { Origin: 'https://other-site.fr' },
      )
    ).status,
    403,
  );
  assert.equal((await postResearch({ text: 'x'.repeat(25_000) })).status, 400);
  const previousKey = process.env.TAVILY_API_KEY;
  try {
    delete process.env.TAVILY_API_KEY;
    assert.equal(
      (await postResearch({ company: companies.companies[0] })).status,
      503,
    );
    process.env.TAVILY_API_KEY = 'fixture-key-not-a-real-credential';
    assert.equal(
      (await postResearch({ company: companies.companies[0] })).status,
      401,
    );
  } finally {
    if (previousKey === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = previousKey;
  }
  const mcp = await request('/mcp');
  assert.equal(mcp.status, 404);
  const demo = await request('/demo/reclamation');
  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /Traiter la réclamation/);
  console.log(
    'Vercel handler OK: root, Radar, saved companies excluded and refreshed, private cache, failed reads and expired sessions, research guards, MCP disabled, demo.',
  );
} finally {
  globalThis.fetch = originalFetch;
}
