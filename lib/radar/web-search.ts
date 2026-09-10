import { publicUrl } from './public-page.ts';
import type { RadarCompany } from './types.ts';

export type WebsiteSearch = (
  company: RadarCompany,
  deadline: number,
) => Promise<string[]>;
export const isDirectory = (hostname: string) =>
  /(?:^|\.)(?:pagesjaunes\.fr|societe\.com|pappers\.fr|verif\.com|annuaire-entreprises\.data\.gouv\.fr|linkedin\.com|facebook\.com|instagram\.com|indeed\.com|hellowork\.com|duckduckgo\.com|google\.[a-z.]+|bing\.com)$/.test(
    hostname,
  );

export function automaticSearchAvailable() {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

// Le moteur fournit des adresses ; seuls les textes lus sur les sites deviennent des indices.
export const searchWebsites: WebsiteSearch = async (company, deadline) => {
  const key = process.env.TAVILY_API_KEY?.trim();
  if (!key)
    throw new Error('La recherche automatique des sites reste à activer.');
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `"${company.nom}" ${company.commune} ${company.siren} site officiel`,
      search_depth: 'basic',
      max_results: 6,
      auto_parameters: false,
      include_answer: false,
      include_raw_content: false,
      include_images: false,
    }),
    signal: AbortSignal.timeout(
      Math.max(1, Math.min(9000, deadline - Date.now())),
    ),
  });
  if (!response.ok)
    throw new Error('Le service de recherche web est indisponible.');
  const payload: unknown = await response.json();
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('results' in payload) ||
    !Array.isArray(payload.results)
  ) {
    throw new Error('Réponse du moteur inexploitable.');
  }
  const sites: string[] = [];
  for (const result of payload.results) {
    try {
      if (!result || typeof result.url !== 'string') continue;
      const url = publicUrl(result.url);
      if (
        !isDirectory(url.hostname) &&
        !sites.some(
          (site) =>
            new URL(site).hostname.replace(/^www\./, '') ===
            url.hostname.replace(/^www\./, ''),
        )
      )
        sites.push(url.origin);
    } catch {
      /* Les adresses invalides et les réseaux privés sont écartés. */
    }
  }
  return sites.slice(0, 3);
};
