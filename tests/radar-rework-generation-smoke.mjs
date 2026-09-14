// Runs against the compiled server. Provider and Supabase are stubbed, never the live account.
import assert from 'node:assert/strict';
import { reworkDataSchema } from '../lib/radar/rework.ts';
const owner = '11111111-2222-4333-8444-555555555555';
const id = '11111111-2222-4333-8444-666666666666';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://radar-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
process.env.AI_GATEWAY_API_KEY = 'test-gateway-key';
let project = {
  id,
  user_id: owner,
  identity_key: 'name:entreprisetemoin:',
  revision: 1,
  data: reworkDataSchema.parse({
    name: 'Entreprise témoin',
    decision: 'retained',
  }),
};
let imageCalls = 0;
let textCalls = 0;
let failImage = false;
let conflictDuringImage = false;
const versions = [];
const files = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  const headers = new Headers(init?.headers);
  if (url.hostname === 'ai-gateway.vercel.sh') {
    if (url.pathname.endsWith('/credits'))
      return Response.json({ balance: '1.00' });
    if (url.pathname.endsWith('/language-model')) {
      const body = JSON.parse(init.body);
      const isImage = !body.responseFormat;
      if (isImage) {
        imageCalls += 1;
        if (failImage)
          return Response.json(
            { error: { message: 'simulated provider failure' } },
            { status: 500 },
          );
        if (conflictDuringImage) {
          project = {
            ...project,
            revision: project.revision + 1,
            data: { ...project.data, decision: 'discarded' },
          };
        }
      } else textCalls += 1;
      return Response.json({
        content: isImage
          ? [
              {
                type: 'file',
                mediaType: 'image/png',
                data: {
                  type: 'data',
                  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5N8AAAAASUVORK5CYII=',
                },
              },
            ]
          : [
              {
                type: 'text',
                text: JSON.stringify({
                  brief:
                    'Un brief qui conserve les observations de l’entreprise et précise l’action principale attendue du visiteur.',
                  direction_a:
                    'Le geste et la matière\nUne composition de carnet d’atelier avec un dessin central, une typographie sobre et une action de contact directement visible.',
                  direction_b:
                    'Le lieu en grand\nUne composition photographique plus dense, une entrée par les réalisations, de grandes légendes et une navigation horizontale précise.',
                }),
              },
            ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 100 }, outputTokens: { total: 100 } },
        warnings: [],
      });
    }
    throw new Error(`Unexpected provider endpoint: ${url.pathname}`);
  }
  if (url.hostname.endsWith('.supabase.co')) {
    if (url.pathname === '/auth/v1/user')
      return headers.get('authorization') === 'Bearer test-session'
        ? Response.json({ id: owner })
        : Response.json({ message: 'unauthorized' }, { status: 401 });
    if (url.pathname === '/rest/v1/radar_members')
      return Response.json({ user_id: owner });
    if (url.pathname === '/rest/v1/radar_rework_projects') {
      assert.equal(url.searchParams.get('user_id'), `eq.${owner}`);
      assert.equal(url.searchParams.get('id'), `eq.${id}`);
      if (init?.method === 'PATCH') {
        if (url.searchParams.get('revision') !== `eq.${project.revision}`)
          return Response.json(null);
        versions.push(structuredClone(project.data));
        project = {
          ...project,
          data: JSON.parse(init.body).data,
          revision: project.revision + 1,
        };
      }
      return Response.json(project);
    }
    if (url.pathname.startsWith('/storage/v1/object/radar-rework/')) {
      assert.ok(
        url.pathname.startsWith(
          `/storage/v1/object/radar-rework/${owner}/${id}/`,
        ),
      );
      files.push(url.pathname);
      return Response.json({ Key: url.pathname });
    }
    throw new Error(`Unexpected database endpoint: ${url.pathname}`);
  }
  throw new Error(`Unexpected network host: ${url.hostname}`);
};
try {
  const { default: app } =
    await import('../.vercel/output/functions/__server.func/index.mjs');
  const call = (
    authorization = 'Bearer test-session',
    origin = 'http://localhost',
  ) =>
    app.fetch(
      new Request('http://localhost/api/radar/rework/prepare', {
        method: 'POST',
        headers: { Authorization: authorization, Origin: origin },
        body: JSON.stringify({ id }),
      }),
    );
  assert.equal((await call('', 'http://localhost')).status, 401);
  assert.equal(
    (await call('Bearer test-session', 'https://elsewhere.invalid')).status,
    403,
  );
  assert.equal(textCalls + imageCalls, 0);
  let response = await call();
  assert.equal(response.status, 200, await response.text());
  assert.equal(textCalls, 1);
  assert.equal(project.data.automation.status, 'queued');
  assert.ok(project.data.brief);
  response = await call();
  assert.equal(response.status, 200, await response.text());
  const firstImage = project.data.images.a;
  assert.ok(firstImage);
  failImage = true;
  assert.equal((await call()).status, 502);
  assert.equal(project.data.images.a, firstImage);
  assert.equal(project.data.images.b, '');
  assert.equal(project.data.automation.status, 'error');
  const failedCalls = imageCalls;
  assert.equal((await call()).status, 200);
  assert.equal(imageCalls, failedCalls, 'failed jobs do not silently retry');
  project.data.automation.status = 'queued';
  failImage = false;
  response = await call();
  assert.equal(response.status, 200, await response.text());
  assert.equal(project.data.automation.status, 'ready');
  assert.equal(project.data.images.a, firstImage);
  assert.ok(project.data.images.b);
  const completedCalls = imageCalls;
  await call();
  assert.equal(imageCalls, completedCalls, 'completed jobs are idempotent');
  assert.equal(textCalls, 1);
  assert.equal(new Set(files).size, 2);
  // A human rejection during model generation wins over the stale result.
  project.data.images.b = '';
  project.data.automation.status = 'queued';
  conflictDuringImage = true;
  assert.equal((await call()).status, 409);
  assert.equal(project.data.decision, 'discarded');
  assert.equal(project.data.images.b, '');
  assert.ok(
    versions.some((data) => data.images.a === firstImage && !data.images.b),
  );
  console.log(
    'Compiled preparation OK: auth, origin, brief, two images, checkpoint recovery, no duplicate calls, human decision wins.',
  );
} finally {
  globalThis.fetch = realFetch;
}
