import type { Metadata } from 'next';
import Vitrine from './vitrine';

export const metadata: Metadata = {
  icons: { icon: '/brand/favicon.svg' },
  title: 'Vrai Consulting — De vrais outils. À votre portée.',
  description:
    'Applications et IA pour les petites entreprises. Romain Bottero, consultant en Vendée : des outils concrets, adaptés à votre métier et à votre budget.',
};

export default function Page() {
  return <Vitrine />;
}
