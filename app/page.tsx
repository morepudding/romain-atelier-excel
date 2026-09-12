import type { Metadata } from 'next';
import { requireChatGPTUser } from './chatgpt-auth';
import Workspace from './workspace';
import Vitrine from './vitrine/vitrine';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  icons: { icon: '/brand/favicon.svg' },
  title: 'Vrai Consulting — De vrais outils. À votre portée.',
  description:
    'Applications et IA pour les petites entreprises. Romain Bottero, consultant en Vendée : des outils concrets, adaptés à votre métier et à votre budget.',
};

export default async function Page() {
  if (process.env.VERCEL === '1') {
    return <Vitrine />;
  }

  await requireChatGPTUser('/');
  return <Workspace />;
}
