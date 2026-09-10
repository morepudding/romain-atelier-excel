// Run after npm run build:vercel. Tests the generated Vercel fetch handler.
// Public enterprise API is stubbed; this is not a live external-API test.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
process.env.VERCEL = '1';
const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/radar-api.json', import.meta.url), 'utf8'),
);
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname === 'recherche-entreprises.api.gouv.fr')
    return Response.json(fixture);
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
  const mcp = await request('/mcp');
  assert.equal(mcp.status, 404);
  const demo = await request('/demo/reclamation');
  assert.equal(demo.status, 200);
  assert.match(await demo.text(), /Traiter la réclamation/);
  console.log(
    'Vercel handler OK: root, native Radar, validation, five fixture cards, MCP disabled, demo.',
  );
} finally {
  globalThis.fetch = originalFetch;
}
