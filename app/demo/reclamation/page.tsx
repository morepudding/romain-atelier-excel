import { redirect } from 'next/navigation';

export const metadata = { title: 'Maison Martin — Démonstration vidéo' };

export default function ReclamationPage() {
  redirect('/demo/maison-martin');
}
