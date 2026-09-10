import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildResearch,
  parseCompanyPage,
  researchCompany,
} from '../lib/radar/research.ts';
import {
  publicUrl,
  isPublicAddress,
  readPublicPage,
} from '../lib/radar/public-page.ts';
import { researchInput } from '../lib/radar/research-input.ts';
import { searchWebsites } from '../lib/radar/web-search.ts';
import type { RadarCompany } from '../lib/radar/types.ts';

const company: RadarCompany = {
  siren: '123456789',
  nom: 'ATELIER VENDÉEN',
  commune: 'VAIRÉ',
  codePostal: '85150',
  distanceKm: 3,
  activiteCode: '43.32A',
  activiteLibelle: 'Menuiserie',
  trancheEffectif: '10 à 19 salariés',
  nombreEtablissements: 2,
  niveauPriorite: 'Intéressante',
  raisonSelection: 'Entreprise locale.',
  workflowProbable: 'Des demandes clients pourraient nécessiter un suivi.',
  sourceUrl: 'https://annuaire-entreprises.data.gouv.fr/entreprise/123456789',
};
const page = (html: string, path = '/') =>
  parseCompanyPage({
    url: `https://atelier-vendeen.fr${path}`,
    html: `<html><body>${html}</body></html>`,
  });
const home = page(
  '<h1>Atelier Vendéen à Vairé</h1><p>Notre service après-vente assure la réparation de vos menuiseries.</p><a href="/contact">Contact</a>',
);
const legal = page('<p>SIRET : 12345678900012</p>', '/mentions-legales');
const contact = page(
  '<a href="mailto:bonjour@atelier-vendeen.fr">Écrivez-nous</a><a href="tel:0251000000">Téléphone</a>',
  '/contact',
);

void test('une identité confirmée, un indice et un contact préparent une approche sourcée', () => {
  const data = buildResearch(
    company,
    [home, legal, contact],
    [],
    new Date('2026-09-10T10:00:00Z'),
  );
  assert.equal(data.identity, 'siren');
  assert.equal(data.priority, 'À contacter en priorité');
  assert.equal(
    data.evidence[0].excerpt,
    'Notre service après-vente assure la réparation de vos menuiseries.',
  );
  assert.equal(data.evidence[0].sourceUrl, home.url);
  assert.equal(data.contact.email, 'bonjour@atelier-vendeen.fr');
  assert.match(data.message!.body, /exemple fictif/);
  assert.ok(data.message!.body.includes(data.evidence[0].excerpt));
  assert.match(data.hypothesis, /restent à confirmer/);
  assert.ok(
    Buffer.byteLength(JSON.stringify({ ...company, research: data })) < 20_000,
  );
});

void test('un homonyme avec un autre SIREN ne fournit ni preuve, ni contact, ni message', () => {
  const wrongLegal = page('<p>SIREN : 987654321</p>', '/mentions-legales');
  const data = buildResearch(company, [home, wrongLegal, contact], []);
  assert.equal(data.identity, 'unconfirmed');
  assert.equal(data.priority, 'À qualifier');
  assert.deepEqual(data.evidence, []);
  assert.equal(data.contact.email, null);
  assert.equal(data.message, null);
});

void test('nom et ville seuls restent une correspondance à confirmer', () => {
  const data = buildResearch(company, [home, contact], []);
  assert.equal(data.identity, 'name_location');
  assert.equal(data.priority, 'À qualifier');
  assert.match(data.limitations.join(' '), /SIREN n’a pas été retrouvé/);
  const otherTown = page(
    '<p>Atelier Vendéen à Nantes, notre service après-vente est disponible.</p>',
  );
  assert.equal(
    buildResearch(company, [otherTown, contact], []).identity,
    'unconfirmed',
  );
});

void test('les scripts, contenus cachés et liens de confidentialité ne deviennent pas des contacts ou des indices', () => {
  const content = page(
    '<script>Notre SAV utilise Excel</script><p hidden>Notre service après-vente.</p><a href="mailto:dpo@atelier-vendeen.fr">Données</a><a href="javascript:alert(1)">Contact</a><a href="http://127.0.0.1/secret">Contact interne</a>',
  );
  const data = buildResearch(company, [content, legal], []);
  assert.deepEqual(data.evidence, []);
  assert.equal(data.contact.email, null);
  assert.equal(data.message, null);
  assert.deepEqual(content.links, []);
});

void test('un menu recrutement ne suffit pas et une absence de SAV ne devient pas un indice positif', () => {
  const data = buildResearch(
    company,
    [
      page(
        '<p>Nous ne proposons pas de service après-vente.</p><a href="/recrutement">Recrutement</a>',
      ),
      page('<h1>Rejoignez notre équipe</h1>', '/recrutement'),
      legal,
    ],
    [],
  );
  assert.deepEqual(data.evidence, []);
  const job = buildResearch(
    company,
    [
      page(
        '<p>Nous recherchons un menuisier en CDI pour notre atelier.</p>',
        '/recrutement',
      ),
      legal,
    ],
    [],
  );
  assert.equal(job.evidence[0].kind, 'recrutement');
  assert.equal(job.priority, 'À qualifier');
  assert.equal(job.message, null);
  assert.match(job.limitations.join(' '), /ancienne/);
});

void test('une page inaccessible conserve les autres preuves et affiche la limite', async () => {
  const visited: string[] = [];
  const data = await researchCompany(company, 'https://atelier-vendeen.fr', {
    read: async (url) => {
      visited.push(url);
      if (url.endsWith('/contact')) throw new Error('timeout');
      if (url.endsWith('/mentions-legales'))
        return { url, html: '<p>SIREN : 123 456 789</p>' };
      return {
        url,
        html: '<p>Notre service après-vente assure vos réparations.</p><a href="/mentions-legales">Mentions</a><a href="/contact">Contact</a><a href="https://another-site.fr/contact">Partenaire</a>',
      };
    },
  });
  assert.equal(data.identity, 'siren');
  assert.equal(data.status, 'partial');
  assert.equal(data.evidence[0].kind, 'sav');
  assert.match(data.limitations.join(' '), /Certaines pages/);
  assert.equal(visited.length, 3);
  assert.ok(
    visited.every((url) => new URL(url).hostname === 'atelier-vendeen.fr'),
  );
});

void test('la recherche écarte un homonyme et consulte le candidat suivant', async () => {
  const data = await researchCompany(company, undefined, {
    search: async () => ['https://homonyme.fr', 'https://atelier-vendeen.fr'],
    read: async (url) => ({
      url,
      html: url.includes('homonyme')
        ? '<p>Atelier ailleurs : service après-vente.</p>'
        : '<p>SIREN : 123456789</p><p>Notre service après-vente assure vos réparations.</p><a href="mailto:contact@atelier-vendeen.fr">Contact</a>',
    }),
  });
  assert.equal(data.website, 'https://atelier-vendeen.fr');
  assert.equal(data.priority, 'À contacter en priorité');
});

void test('un moteur indisponible ou un site inexploitable produit une fiche honnête', async () => {
  const data = await researchCompany(company, undefined, {
    search: async () => {
      throw new Error('provider unavailable');
    },
  });
  assert.equal(data.status, 'unavailable');
  assert.equal(data.message, null);
  assert.deepEqual(data.evidence, []);
  const directory = await researchCompany(
    company,
    'https://pappers.fr/entreprise/123456789',
    {
      read: async () => {
        throw new Error('ne doit pas être appelé');
      },
    },
  );
  assert.equal(directory.status, 'unavailable');
});

void test('les URLs privées, protocoles, identifiants et adresses détournées sont rejetés', async () => {
  for (const value of [
    'http://127.0.0.1',
    'http://2130706433',
    'http://0x7f000001',
    'http://[::1]',
    'http://[::ffff:127.0.0.1]',
    'http://169.254.169.254/latest',
    'https://u:p@public.fr',
    'file:///etc/passwd',
    'https://public.fr:8080',
    'https://foo.internal',
  ]) {
    assert.throws(() => publicUrl(value), value);
    assert.equal(
      researchInput.safeParse({ company, website: value }).success,
      false,
    );
  }
  for (const ip of [
    '10.0.0.1',
    '172.16.10.5',
    '192.168.1.2',
    '100.64.0.1',
    '224.0.0.1',
    'fe80::1',
    'fc00::1',
    '2002:7f00:1::',
  ])
    assert.equal(isPublicAddress(ip), false);
  assert.equal(isPublicAddress('8.8.8.8'), true);
  assert.equal(isPublicAddress('2606:4700:4700::1111'), true);
  assert.equal(
    publicUrl('https://atelier-vendeen.fr/#contact').href,
    'https://atelier-vendeen.fr/',
  );
  await assert.rejects(readPublicPage('http://127.0.0.1', Date.now() + 1000));
  await assert.rejects(
    readPublicPage('https://atelier-vendeen.fr', Date.now() - 1),
    /Délai/,
  );
});

void test('le fournisseur ne fournit que des URLs filtrées, sans transformer ses résumés en preuves', async (t) => {
  const previous = process.env.TAVILY_API_KEY;
  process.env.TAVILY_API_KEY = 'fixture-key';
  t.after(() => {
    if (previous === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = previous;
  });
  t.mock.method(
    globalThis,
    'fetch',
    async (_url: unknown, options: RequestInit) => {
      const request = JSON.parse(options.body as string);
      assert.equal(request.search_depth, 'basic');
      assert.equal(request.include_answer, false);
      return Response.json({
        results: [
          { url: 'https://pappers.fr/company', content: 'Un besoin inventé.' },
          { url: 'http://127.0.0.1/private' },
          {
            url: 'https://atelier-vendeen.fr/contact',
            content: 'Utilise Excel.',
          },
          { url: 'https://www.atelier-vendeen.fr/mentions' },
        ],
      });
    },
  );
  assert.deepEqual(await searchWebsites(company, Date.now() + 9000), [
    'https://atelier-vendeen.fr',
  ]);
});
