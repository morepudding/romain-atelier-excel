import { load } from 'cheerio';
import {
  publicUrl,
  readPublicPage,
  type PageReader,
  type PublicPage,
} from './public-page.ts';
import type { RadarCompany } from './types.ts';
import type {
  CompanyResearch,
  ResearchEvidence,
  ResearchSource,
} from './research-types.ts';
import {
  isDirectory,
  searchWebsites,
  type WebsiteSearch,
} from './web-search.ts';

const normalize = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const compact = (text: string) => text.replace(/\s+/g, ' ').trim();
const host = (value: string) => new URL(value).hostname.replace(/^www\./, '');

type ParsedPage = ResearchSource & {
  text: string;
  blocks: string[];
  links: { url: string; label: string }[];
  email: string | null;
  phone: string | null;
};

export function parseCompanyPage(page: PublicPage): ParsedPage {
  const $ = load(page.html);
  const title =
    compact($('title').first().text()).slice(0, 140) ||
    new URL(page.url).hostname;
  $(
    'script,style,noscript,svg,iframe,template,[hidden],[aria-hidden="true"]',
  ).remove();
  const links: ParsedPage['links'] = [];
  let email: string | null = null;
  let phone: string | null = null;
  $('a[href]').each((_, element) => {
    const href = $(element).attr('href') || '';
    if (/^mailto:/i.test(href)) {
      const value = href.slice(7).split('?')[0];
      if (
        /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(value) &&
        value.length < 120 &&
        !/^(?:dpo|privacy|rgpd|webmaster|abuse)@/i.test(value)
      )
        email ??= value;
      return;
    }
    if (/^tel:/i.test(href)) {
      const value = href.slice(4).replace(/[\s().-]/g, '');
      if (/^\+?\d{9,15}$/.test(value)) phone ??= value;
      return;
    }
    try {
      const url = publicUrl(new URL(href, page.url).href);
      if (
        host(url.href) === host(page.url) &&
        !/\.(pdf|zip|jpg|png|webp|svg)$/i.test(url.pathname)
      ) {
        links.push({
          url: url.href,
          label: compact($(element).text()).slice(0, 120),
        });
      }
    } catch {
      /* Les liens non web ne sont pas parcourus. */
    }
  });
  // Des blocs courts conservent le contexte de l'extrait, sans lire les scripts.
  const blocks = $('p,li,h1,h2,h3,h4,td,dd')
    .map((_, el) => compact($(el).text()))
    .get()
    .filter((text) => text.length >= 20 && text.length <= 1600);
  const text = compact($('body').text()).slice(0, 100_000);
  const path = normalize(new URL(page.url).pathname + ' ' + title);
  const kind = /recrut|carrier|emploi|rejoignez|offres d emploi/.test(path)
    ? 'recrutement'
    : /mention|legal/.test(path)
      ? 'identite'
      : /contact/.test(path)
        ? 'contact'
        : 'site';
  return { url: page.url, title, kind, text, blocks, links, email, phone };
}

export function extractEvidence(pages: ParsedPage[]): ResearchEvidence[] {
  const rules: {
    kind: ResearchEvidence['kind'];
    label: string;
    pattern: RegExp;
  }[] = [
    {
      kind: 'sav',
      label: 'Un service après-vente est mentionné',
      pattern: /\bsav\b|service(?:s)? apres vente/,
    },
    {
      kind: 'interventions',
      label: 'Des interventions ou dépannages sont mentionnés',
      pattern: /\binterventions?\b|\bdepannages?\b|maintenance/,
    },
    {
      kind: 'suivi',
      label: 'Un suivi de dossiers ou des relances sont mentionnés',
      pattern:
        /suivi (?:des? |de vos |de leurs )?(?:dossiers|interventions|commandes|reclamations)|\brelances?\b/,
    },
  ];
  const evidence: ResearchEvidence[] = [];
  for (const rule of rules) {
    for (const page of pages.filter((p) => p.kind !== 'identite')) {
      const block = page.blocks.find((text) => {
        const normalized = normalize(text);
        return (
          rule.pattern.test(normalized) &&
          !/\b(?:aucun|sans|pas de) (?:service apres vente|sav)\b/.test(
            normalized,
          )
        );
      });
      if (!block) continue;
      const match = rule.pattern.exec(normalize(block));
      const start = Math.max(0, (match?.index || 0) - 65);
      evidence.push({
        kind: rule.kind,
        label: rule.label,
        excerpt:
          (start ? '…' : '') +
          block.slice(start, start + 200) +
          (block.length > start + 200 ? '…' : ''),
        sourceUrl: page.url,
      });
      break;
    }
  }
  const jobPage = pages.find(
    (page) =>
      page.kind === 'recrutement' &&
      page.blocks.some((block) =>
        /\brecrutons\b|\brecherchons\b|\bcdi\b|\bcdd\b|offre d emploi/.test(
          normalize(block),
        ),
      ),
  );
  if (jobPage) {
    const block = jobPage.blocks.find((b) =>
      /\brecrutons\b|\brecherchons\b|\bcdi\b|\bcdd\b|offre d emploi/.test(
        normalize(b),
      ),
    )!;
    evidence.push({
      kind: 'recrutement',
      label: 'Une annonce de recrutement est consultable',
      excerpt: block.slice(0, 200) + (block.length > 200 ? '…' : ''),
      sourceUrl: jobPage.url,
    });
  }
  return evidence;
}

export function buildResearch(
  company: RadarCompany,
  pages: ParsedPage[],
  limitations: string[],
  now = new Date(),
): CompanyResearch {
  const sirenPattern = new RegExp(
    '(?:^|\\D)' +
      company.siren.split('').join('[\\s.\\-]?') +
      '(?:(?:[\\s.\\-]?\\d){5})?(?:\\D|$)',
  );
  const legal = pages.find((page) => sirenPattern.test(page.text));
  const conflictingIdentity = pages.some(
    (page) =>
      page.kind === 'identite' &&
      /\bsire[nt]\s*[:.]?\s*\d[\d\s.-]{7,}/i.test(page.text) &&
      !sirenPattern.test(page.text),
  );
  const tokens = normalize(company.nom)
    .split(' ')
    .filter(
      (word) =>
        word.length >= 3 &&
        ![
          'sas',
          'sarl',
          'societe',
          'entreprise',
          'etablissements',
          'france',
        ].includes(word),
    );
  const matching = pages.find((page) => {
    const content = normalize(page.title + ' ' + page.text);
    return (
      !conflictingIdentity &&
      tokens.length > 0 &&
      tokens.every((word) => content.split(' ').includes(word)) &&
      (content.includes(normalize(company.commune)) ||
        content.includes(company.codePostal))
    );
  });
  const identity = legal ? 'siren' : matching ? 'name_location' : 'unconfirmed';
  const usablePages = identity === 'unconfirmed' ? [] : pages;
  const evidence = extractEvidence(usablePages);
  const contactPage =
    usablePages
      .filter((page) => page.kind !== 'identite')
      .sort(
        (a, b) => Number(b.kind === 'contact') - Number(a.kind === 'contact'),
      )
      .find((p) => p.email || p.phone) ||
    usablePages.find((p) => p.kind === 'contact');
  const hasSav = evidence.some((item) => item.kind === 'sav');
  const hasInterventions = evidence.some(
    (item) => item.kind === 'interventions',
  );
  const hasWorkflow =
    hasSav ||
    hasInterventions ||
    evidence.some((item) => item.kind === 'suivi');
  const workflowEvidence = evidence.find((item) => item.kind !== 'recrutement');
  const priority =
    identity === 'siren' && hasWorkflow && contactPage
      ? 'À contacter en priorité'
      : 'À qualifier';
  const demo = hasSav
    ? {
        title: 'Suivre un dossier SAV de bout en bout',
        explanation:
          'Montrer les échanges, le responsable, l’échéance et la réponse préparée sur un dossier fictif.',
      }
    : hasInterventions
      ? {
          title: 'Retrouver la prochaine action sur une intervention',
          explanation:
            'Montrer comment une demande devient un dossier attribué à un responsable, avec une échéance.',
        }
      : {
          title: 'Un exemple de traitement d’une demande client',
          explanation:
            'Vérifier d’abord quel suivi pourrait être utile avant de choisir une partie de la démo.',
        };
  const summary =
    identity === 'unconfirmed'
      ? 'Aucun site n’a pu être rattaché avec assez de certitude à cette entreprise.'
      : hasWorkflow
        ? `${hasSav ? 'Un service après-vente' : hasInterventions ? 'Des interventions' : 'Un suivi de dossiers'} apparaît dans les pages consultées. ${contactPage ? 'Un contact professionnel est disponible pour vérifier si votre démo peut être utile.' : 'Il reste à identifier la personne qui gère ce suivi.'}`
        : 'Le site apporte des informations sur l’entreprise, mais aucun indice suffisamment précis ne relie les pages consultées à votre démo.';
  const role = hasSav
    ? 'Personne qui coordonne le SAV (fonction à confirmer)'
    : hasInterventions
      ? 'Personne qui planifie les interventions (fonction à confirmer)'
      : 'Responsable du suivi des demandes clients (fonction à confirmer)';
  return {
    version: 1,
    status: !pages.length
      ? 'unavailable'
      : identity === 'unconfirmed' || limitations.length
        ? 'partial'
        : 'complete',
    researchedAt: now.toISOString(),
    website: pages[0]?.url || null,
    identity,
    identitySourceUrl: (legal || matching)?.url || null,
    priority,
    summary,
    evidence,
    sources: pages
      .slice(0, 6)
      .map(({ url, title, kind }) => ({ url, title, kind })),
    contact: {
      role,
      email: contactPage?.email || null,
      phone: contactPage?.phone || null,
      sourceUrl: contactPage?.url || null,
    },
    demo,
    hypothesis: hasWorkflow
      ? 'Un dossier partagé pourrait faciliter ce suivi si les informations sont aujourd’hui dispersées. L’organisation actuelle et le besoin restent à confirmer.'
      : company.workflowProbable +
        ' Cette hypothèse vient de l’activité déclarée, sans confirmation sur le site.',
    questions: [
      ...(identity === 'name_location'
        ? ['Confirmer que le site correspond bien à cette entreprise.']
        : []),
      'Quel outil utilisez-vous aujourd’hui pour ce suivi ?',
      'Y a-t-il une difficulté assez importante pour envisager une amélioration ?',
      'Qui pourrait décider d’une première mission ?',
    ],
    message:
      identity !== 'unconfirmed' && hasWorkflow
        ? {
            subject: hasSav
              ? 'Suivi de vos dossiers SAV'
              : 'Suivi de vos demandes clients',
            body: `Bonjour,\n\nJ’ai relevé ce passage sur votre site : « ${workflowEvidence!.excerpt} ». Je développe des outils de gestion et suis basé près de Vairé.\n\nJ’ai préparé un exemple fictif pour retrouver les échanges, le responsable et la prochaine action sur une demande client. Souhaitez-vous que je vous l’envoie pour voir si ce fonctionnement pourrait vous être utile ?\n\nRomain`,
          }
        : null,
    limitations: [
      ...new Set([
        ...limitations,
        ...(identity === 'unconfirmed'
          ? [
              'Le contenu d’un site non identifié n’est pas utilisé comme preuve sur cette entreprise.',
            ]
          : []),
        ...(identity === 'name_location'
          ? [
              'Le nom et la localisation correspondent, mais le SIREN n’a pas été retrouvé sur les pages consultées.',
            ]
          : []),
        ...(evidence.some((e) => e.kind === 'recrutement')
          ? [
              'Une annonce consultable peut être ancienne : vérifier sa date et si le poste est encore ouvert.',
            ]
          : []),
        'Les pages publiques ne permettent pas de connaître le budget, les outils internes ou l’intention d’achat.',
      ]),
    ].slice(0, 5),
  };
}

const cache = new Map<string, { expires: number; value: CompanyResearch }>();
const pending = new Map<string, Promise<CompanyResearch>>();

export async function researchCompany(
  company: RadarCompany,
  website?: string,
  dependencies: {
    read?: PageReader;
    search?: WebsiteSearch;
    now?: () => Date;
  } = {},
): Promise<CompanyResearch> {
  const key = JSON.stringify([
    company.siren,
    company.nom,
    company.commune,
    website || '',
  ]);
  const useCache =
    !dependencies.read && !dependencies.search && !dependencies.now;
  if (useCache) {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.value;
    if (pending.has(key)) return pending.get(key)!;
  }
  async function run() {
    const read = dependencies.read || readPublicPage;
    const deadline = Date.now() + 42_000;
    const limitations: string[] = [];
    let candidates: string[];
    try {
      candidates = website
        ? [publicUrl(website).href]
        : await (dependencies.search || searchWebsites)(company, deadline);
    } catch {
      return buildResearch(
        company,
        [],
        [
          'La recherche web est indisponible. Vous pouvez renseigner le site officiel pour poursuivre.',
        ],
        dependencies.now?.(),
      );
    }
    let best: ParsedPage[] = [];
    for (const candidate of candidates) {
      if (Date.now() >= deadline) break;
      if (isDirectory(new URL(candidate).hostname)) continue;
      const pages: ParsedPage[] = [];
      try {
        const page = await read(candidate, deadline);
        if (isDirectory(new URL(page.url).hostname)) continue;
        pages.push(parseCompanyPage(page));
      } catch {
        continue;
      }
      const urls = new Set<string>([pages[0].url]);
      const relevantLinks = pages[0].links.filter((link) =>
        /contact|mention|legal|recrut|carrier|emploi|rejoignez|sav|apres.vente|maintenance|intervention|depannage/i.test(
          link.url + ' ' + link.label,
        ),
      );
      const ordered = relevantLinks.sort(
        (a, b) =>
          Number(/mention|legal/i.test(b.url)) -
          Number(/mention|legal/i.test(a.url)),
      );
      for (const link of ordered) {
        if (pages.length >= 6 || urls.size >= 8 || Date.now() >= deadline)
          break;
        if (urls.has(link.url)) continue;
        urls.add(link.url);
        try {
          const page = await read(link.url, deadline);
          if (host(page.url) === host(pages[0].url))
            pages.push(parseCompanyPage(page));
        } catch {
          limitations.push(
            'Certaines pages du site n’ont pas pu être consultées.',
          );
        }
      }
      const assessment = buildResearch(company, pages, []);
      if (assessment.identity === 'siren') {
        best = pages;
        break;
      }
      if (!best.length || assessment.identity === 'name_location') best = pages;
    }
    if (!best.length)
      limitations.push(
        'Aucun site exploitable trouvé pendant cette recherche. Vous pouvez préciser son adresse.',
      );
    const value = buildResearch(
      company,
      best,
      limitations,
      dependencies.now?.(),
    );
    if (useCache) {
      if (cache.size >= 100) cache.delete(cache.keys().next().value!);
      cache.set(key, {
        value,
        expires:
          Date.now() +
          (value.status === 'unavailable' ? 60_000 : 6 * 60 * 60_000),
      });
    }
    return value;
  }
  const task = run();
  if (useCache) pending.set(key, task);
  try {
    return await task;
  } finally {
    if (useCache) pending.delete(key);
  }
}
