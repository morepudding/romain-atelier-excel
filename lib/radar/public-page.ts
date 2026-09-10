import { lookup } from 'node:dns/promises';
import { request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

export type PublicPage = { url: string; html: string };
export type PageReader = (url: string, deadline: number) => Promise<PublicPage>;

const privateNetworks = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
] as const)
  privateNetworks.addSubnet(address, prefix, 'ipv4');
privateNetworks.addSubnet('2001::', 23, 'ipv6');
privateNetworks.addSubnet('2001:db8::', 32, 'ipv6');
privateNetworks.addSubnet('2002::', 16, 'ipv6');
const globalV6 = new BlockList();
globalV6.addSubnet('2000::', 3, 'ipv6');

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return !privateNetworks.check(address, 'ipv4');
  return (
    family === 6 &&
    globalV6.check(address, 'ipv6') &&
    !privateNetworks.check(address, 'ipv6')
  );
}

export function publicUrl(value: string): URL {
  if (value.length > 1200) throw new Error('Cette adresse est trop longue.');
  const url = new URL(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, '');
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.port ||
    !hostname.includes('.') ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid|example)$/.test(
      hostname,
    ) ||
    (isIP(hostname) && !isPublicAddress(hostname))
  ) {
    throw new Error(
      'Cette adresse ne correspond pas à un site public accessible.',
    );
  }
  url.hash = '';
  return url;
}

// Chaque redirection est contrôlée et la connexion utilise l'IP vérifiée.
// Aucun cookie, identifiant ni en-tête de la requête utilisateur n'est transmis.
export const readPublicPage: PageReader = async (value, deadline) => {
  let url = publicUrl(value);
  for (let redirect = 0; redirect <= 3; redirect += 1) {
    const remaining = Math.min(7000, deadline - Date.now());
    if (remaining <= 0) throw new Error('Délai de recherche atteint.');
    const addresses = await Promise.race([
      lookup(url.hostname, { all: true, order: 'verbatim' }),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(
          () => reject(new Error('Résolution du site trop lente.')),
          remaining,
        );
        timer.unref();
      }),
    ]);
    if (
      !addresses.length ||
      addresses.some((item) => !isPublicAddress(item.address))
    ) {
      throw new Error(
        'Cette adresse ne correspond pas à un site public accessible.',
      );
    }
    const selected =
      addresses.find((item) => item.family === 4) || addresses[0];
    const response = await new Promise<{ html?: string; location?: string }>(
      (resolve, reject) => {
        const transport =
          url.protocol === 'https:' ? httpsRequest : httpRequest;
        const req = transport(
          url,
          {
            agent: false,
            ...(url.protocol === 'https:' ? { rejectUnauthorized: true } : {}),
            signal: AbortSignal.timeout(
              Math.max(1, Math.min(7000, deadline - Date.now())),
            ),
            headers: {
              'User-Agent':
                'RadarLocal/1.0 (+https://romain-atelier-excel.vercel.app/radar)',
              Accept: 'text/html,application/xhtml+xml',
              'Accept-Encoding': 'identity',
            },
            lookup: (_host, options, callback) => {
              if (options.all) callback(null, [selected]);
              else callback(null, selected.address, selected.family);
            },
          },
          (res) => {
            const status = res.statusCode || 0;
            if (
              [301, 302, 303, 307, 308].includes(status) &&
              res.headers.location
            ) {
              res.resume();
              resolve({ location: res.headers.location });
              return;
            }
            if (
              status !== 200 ||
              !/text\/html|application\/xhtml\+xml/i.test(
                res.headers['content-type'] || '',
              )
            ) {
              res.resume();
              reject(
                new Error(
                  'La page est inaccessible ou ne contient pas de texte consultable.',
                ),
              );
              return;
            }
            let size = 0;
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => {
              size += chunk.length;
              if (size > 1_000_000) {
                req.destroy(
                  new Error('La page dépasse la taille de lecture prévue.'),
                );
                return;
              }
              chunks.push(chunk);
            });
            res.on('error', reject);
            res.on('end', () => {
              const charset =
                /charset=["']?([^\s;"']+)/i.exec(
                  res.headers['content-type'] || '',
                )?.[1] || 'utf-8';
              try {
                resolve({
                  html: new TextDecoder(charset).decode(Buffer.concat(chunks)),
                });
              } catch {
                resolve({ html: Buffer.concat(chunks).toString('utf8') });
              }
            });
          },
        );
        req.on('error', reject);
        req.end();
      },
    );
    if (response.location) {
      url = publicUrl(new URL(response.location, url).href);
      continue;
    }
    return { url: url.href, html: response.html! };
  }
  throw new Error('Le site redirige trop de fois.');
};
