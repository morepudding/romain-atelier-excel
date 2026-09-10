import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { z } from 'zod/v4';
import { findLocalCompanies, RadarApiError } from '@/lib/radar/api';
import { radarConfig } from '@/lib/radar/config';
import { buildRadarUiHtml } from '@/lib/radar/ui';

export const dynamic = 'force-dynamic';
const RESOURCE_URI = 'ui://radar-local/companies-v1.html';
const allowedSections = ['C', 'F', 'G', 'H', 'I', 'L', 'N'] as const;

function createServer() {
  const server = new McpServer(
    { name: 'radar-local', version: '1.0.0' },
    {
      instructions:
        'Les résultats sont des pistes commerciales fondées sur des données publiques. Ne jamais présenter une hypothèse de workflow comme un problème confirmé chez l’entreprise.',
    },
  );

  registerAppResource(
    server,
    'Cartes Radar local',
    RESOURCE_URI,
    {},
    async () => ({
      contents: [
        {
          uri: RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: buildRadarUiHtml(),
          _meta: {
            ui: {
              prefersBorder: false,
              csp: {
                connectDomains: [],
                resourceDomains: [],
              },
            },
          },
        },
      ],
    }),
  );

  registerAppTool(
    server,
    'find_local_companies',
    {
      title: 'Trouver des entreprises locales',
      description:
        'Utiliser cet outil lorsque l’utilisateur souhaite identifier des entreprises situées autour de Vairé qui pourraient être pertinentes pour présenter un workflow de traitement des réclamations clients. L’outil retourne des candidates issues de données publiques. Il ne confirme pas l’existence d’un besoin métier.',
      inputSchema: z.object({
        radiusKm: z.number().min(5).max(50).default(35).optional(),
        limit: z.number().int().min(1).max(8).default(5).optional(),
        targetWorkflow: z
          .enum(['reclamations_client'])
          .default('reclamations_client')
          .optional(),
        activitySections: z
          .array(z.enum(allowedSections))
          .min(1)
          .default([...radarConfig.defaults.activitySections])
          .optional(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
      _meta: {
        ui: { resourceUri: RESOURCE_URI },
        'openai/outputTemplate': RESOURCE_URI,
        'openai/toolInvocation/invoking': 'Recherche d’entreprises locales…',
        'openai/toolInvocation/invoked': 'Entreprises locales trouvées',
      },
    },
    async (input: {
      radiusKm?: number;
      limit?: number;
      targetWorkflow?: 'reclamations_client';
      activitySections?: (typeof allowedSections)[number][];
    }) => {
      try {
        const result = await findLocalCompanies(input);
        const lines = result.companies.map(
          (company, index) =>
            `${index + 1}. ${company.nom} — ${company.commune}, ${company.distanceKm} km — ${company.activiteLibelle} — ${company.trancheEffectif}. ${company.raisonSelection} Hypothèse : ${company.workflowProbable} Fiche officielle : ${company.sourceUrl}`,
        );
        return {
          structuredContent: result,
          content: [
            {
              type: 'text',
              text:
                `Résultats issus de données publiques, récupérés le ${result.retrievedAt}. Ce sont des candidates à examiner, pas des besoins métier confirmés.\n\n` +
                (lines.join('\n') ||
                  'Aucune entreprise ne correspond aux critères demandés.'),
            },
          ],
        };
      } catch (error) {
        const message =
          error instanceof RadarApiError
            ? error.message
            : 'La recherche d’entreprises a échoué de manière inattendue.';
        return {
          isError: true,
          content: [{ type: 'text', text: message }],
        };
      }
    },
  );
  return server;
}

async function handle(request: Request) {
  // Vercel uses the standalone Radar HTTP endpoint, without a ChatGPT connector.
  if (process.env.VERCEL === '1') return new Response('Not Found', { status: 404 });
  if (request.method === 'OPTIONS')
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
        'Access-Control-Allow-Headers':
          'Content-Type,mcp-session-id,mcp-protocol-version,Last-Event-ID',
        'Access-Control-Expose-Headers': 'mcp-session-id,mcp-protocol-version',
      },
    });
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
  });
  const server = createServer();
  await server.connect(transport);
  const response = await transport.handleRequest(request);
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Access-Control-Expose-Headers',
    'mcp-session-id,mcp-protocol-version',
  );
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = handle;
