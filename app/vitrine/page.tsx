import type { Metadata } from 'next';
import Vitrine from './vitrine';

export const metadata: Metadata = {
  title: 'Romain — Votre métier. En plus simple.',
  description: 'Des outils métier concrets, des démonstrations et un Radar local.',
};

export default function Page() {
  return <Vitrine />;
}