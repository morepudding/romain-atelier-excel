import { z } from 'zod';
import { reworkAccess } from '@/lib/radar/rework-access';
import {
  reworkDataSchema,
  type ReworkData,
  type ReworkProject,
} from '@/lib/radar/rework';
import { canPrepare, preparationStep } from '@/lib/radar/rework-flow';
import {
  generationAvailability,
  generateBrief,
  generateMockup,
} from '@/lib/radar/rework-generation';

export const runtime = 'nodejs';
export const maxDuration = 180;
const respond = (body: unknown, status = 200) =>
  Response.json(body, {
    status,
    headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' },
  });
export async function GET() {
  return respond(await generationAvailability());
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return respond({ error: 'Origine non autorisée.' }, 403);
  if (Number(request.headers.get('content-length') || 0) > 2000)
    return respond({ error: 'Requête trop volumineuse.' }, 413);
  const raw = await request.text();
  if (raw.length > 2000)
    return respond({ error: 'Requête trop volumineuse.' }, 413);
  let id: string;
  try {
    id = z.object({ id: z.uuid() }).parse(JSON.parse(raw)).id;
  } catch {
    return respond({ error: 'Dossier invalide.' }, 400);
  }
  const access = await reworkAccess(request);
  if (!access)
    return respond(
      { error: 'Reconnectez-vous pour accéder à vos propositions.' },
      401,
    );
  const { client, owner } = access;
  const read = await client
    .from('radar_rework_projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', owner)
    .maybeSingle();
  if (read.error)
    return respond({ error: 'Impossible de lire le dossier.' }, 503);
  if (!read.data) return respond({ error: 'Dossier introuvable.' }, 404);
  let current = {
    ...read.data,
    data: reworkDataSchema.parse(read.data.data),
  } as ReworkProject;
  if (!canPrepare(current.data))
    return respond({ project: current, idle: true });
  const availability = await generationAvailability();
  if (!availability.available)
    return respond(
      { error: 'La génération des maquettes est indisponible.', availability },
      503,
    );
  const step = preparationStep(current.data)!;
  const lease = crypto.randomUUID();
  async function save(data: ReworkData) {
    const result = await client
      .from('radar_rework_projects')
      .update({ data: reworkDataSchema.parse(data) })
      .eq('id', id)
      .eq('user_id', owner)
      .eq('revision', current.revision)
      .select('*')
      .maybeSingle();
    if (result.error) throw new Error('save_failed');
    if (!result.data) throw new Error('conflict');
    current = {
      ...result.data,
      data: reworkDataSchema.parse(result.data.data),
    } as ReworkProject;
  }
  try {
    await save(
      reworkDataSchema.parse({
        ...current.data,
        automation: {
          ...current.data.automation,
          status: 'working',
          step,
          lease,
          lease_until: Date.now() + 180000,
          attempts: (current.data.automation?.attempts || 0) + 1,
          error: '',
        },
      }),
    );
  } catch {
    return respond(
      { error: 'Le dossier a changé. Actualisation en cours.' },
      409,
    );
  }
  try {
    if (step === 'brief') {
      const { context, ...brief } = await generateBrief(current.data);
      await save({
        ...current.data,
        ...brief,
        automation: {
          ...current.data.automation!,
          context,
          model: 'openai/gpt-5.4-mini',
          status: 'queued',
          lease: '',
          lease_until: 0,
        },
      });
    } else {
      let reference: Uint8Array | undefined;
      const before = current.data.images.before;
      if (before && before.startsWith(`${owner}/${id}/`)) {
        const download = await client.storage
          .from('radar-rework')
          .download(before);
        if (download.error || !download.data)
          throw new Error('reference_failed');
        reference = new Uint8Array(await download.data.arrayBuffer());
      }
      // Deterministic per-attempt path: never overwrite a file preserved in history.
      const { bytes, contentType } = await generateMockup(
        current.data,
        step,
        reference,
      );
      const extension =
        contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1];
      const path = `${owner}/${id}/${lease}-${step}.${extension}`;
      const uploaded = await client.storage
        .from('radar-rework')
        .upload(path, bytes, { contentType, upsert: false });
      if (uploaded.error) throw new Error('upload_failed');
      const images = { ...current.data.images, [step]: path };
      await save({
        ...current.data,
        images,
        automation: {
          ...current.data.automation!,
          status: images.a && images.b ? 'ready' : 'queued',
          lease: '',
          lease_until: 0,
          model: 'google/gemini-3.1-flash-image',
          prepared_at: new Date().toISOString(),
        },
      });
    }
    return respond({ project: current });
  } catch (error) {
    const failure = error instanceof Error ? error.message : '';
    if (failure === 'conflict')
      return respond(
        {
          error:
            'Votre dernière décision a été conservée. Actualisation en cours.',
        },
        409,
      );
    const message =
      failure === 'reference_failed'
        ? 'La référence jointe n’a pas pu être lue. Réessayez.'
        : failure === 'save_failed' || failure === 'upload_failed'
          ? 'Le résultat n’a pas pu être enregistré. Réessayez.'
          : 'La préparation s’est interrompue. Les étapes terminées sont conservées.';
    try {
      await save({
        ...current.data,
        automation: {
          ...current.data.automation!,
          status: 'error',
          lease: '',
          lease_until: 0,
          error: message,
        },
      });
    } catch {
      return respond(
        { error: 'Le dossier a changé. Actualisation en cours.' },
        409,
      );
    }
    return respond({ project: current, error: message }, 502);
  }
}
