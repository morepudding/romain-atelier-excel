import RadarWorkspace from '../radar-workspace';
import '../radar.css';
import '../rework.css';
export const metadata = {
  title: 'Radar Rework — Vrai Consulting',
  robots: { index: false, follow: false },
};
export default function ReworkPage() {
  return <RadarWorkspace initialMode="refonte" />;
}
