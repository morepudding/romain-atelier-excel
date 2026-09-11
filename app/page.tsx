import type { Metadata } from 'next';
import { requireChatGPTUser } from './chatgpt-auth';
import Workspace from './workspace';
import Vitrine from './vitrine/vitrine';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Romain — Votre métier. En plus simple.',
  description: 'Des outils métier concrets, des démonstrations et un Radar local.',
};

export default async function Page() {
  if (process.env.VERCEL === '1') {
    return <Vitrine />;
  }

  await requireChatGPTUser('/');
  return <Workspace />;
}