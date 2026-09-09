import { requireChatGPTUser } from './chatgpt-auth';
import Workspace from './workspace';
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function Page() {
  if (process.env.VERCEL === '1') redirect('/demo/reclamation');
  await requireChatGPTUser('/');
  return <Workspace />;
}
