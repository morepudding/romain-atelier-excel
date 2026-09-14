'use client';

import { useEffect, useRef, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { safeUrl, type ReworkProject } from '@/lib/radar/rework';

// Proposals never execute code or access the parent origin, cookies or session.
// Data images and inline CSS are sufficient for the autonomous HTML/CSS format.
export function isolatedDocument(html: string) {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; form-action 'none'; base-uri 'none'">`;
  return `<!doctype html><html><head>${policy}</head><body>${html}</body></html>`;
}

export default function ReworkPage({
  supabase,
  project,
  slot,
}: {
  supabase: SupabaseClient;
  project: ReworkProject;
  slot: 'a' | 'b';
}) {
  const id = project.data.pages[slot];
  const [page, setPage] = useState({ id: '', html: '', error: '' });
  const [retry, setRetry] = useState(0);
  const [mobile, setMobile] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const label = `Proposition${project.data.presentation === 'single' ? '' : ` ${slot.toUpperCase()}`} — ${project.data.name}`;
  const interactiveUrl = slot === 'a' ? safeUrl(project.data.interactive_url || '') : null;
  useEffect(() => {
    if (!id) return;
    const abort = new AbortController();
    let active = true;
    async function read() {
      try {
        const result = await supabase
          .from('radar_rework_pages')
          .select('html')
          .eq('id', id)
          .eq('user_id', project.user_id)
          .eq('project_id', project.id)
          .eq('slot', slot)
          .abortSignal(abort.signal)
          .single();
        if (result.error || !result.data?.html)
          throw new Error('La page n’a pas pu être chargée.');
        if (active)
          setPage({ id, html: isolatedDocument(result.data.html), error: '' });
      } catch {
        if (active)
          setPage({ id, html: '', error: 'La page n’a pas pu être chargée.' });
      }
    }
    void read();
    return () => {
      active = false;
      abort.abort();
    };
  }, [id, project.id, project.user_id, slot, supabase, retry]);
  const loaded = page.id === id && !!page.html;
  return (
    <div className="rv-web-page">
      {loaded ? (
        <>
          <iframe
            title={label}
            srcDoc={page.html}
            sandbox=""
            referrerPolicy="no-referrer"
          />
          {interactiveUrl ? (
            <a className="rv-interactive-link" href={interactiveUrl} target="_blank" rel="noopener noreferrer">
              Ouvrir la maquette interactive ↗
            </a>
          ) : (
            <button type="button" onClick={() => dialog.current?.showModal()}>
              Ouvrir en grand
            </button>
          )}
          <dialog ref={dialog} className="rv-page-dialog" aria-label={label}>
            <header>
              <strong>{label}</strong>
              <div>
                <button
                  type="button"
                  aria-pressed={!mobile}
                  onClick={() => setMobile(false)}
                >
                  Ordinateur
                </button>
                <button
                  type="button"
                  aria-pressed={mobile}
                  onClick={() => setMobile(true)}
                >
                  Mobile
                </button>
                <button type="button" onClick={() => dialog.current?.close()}>
                  Fermer
                </button>
              </div>
            </header>
            <iframe
              title={`${label} — aperçu agrandi`}
              srcDoc={page.html}
              sandbox=""
              referrerPolicy="no-referrer"
              style={{ width: mobile ? '390px' : '100%' }}
            />
          </dialog>
        </>
      ) : !id && interactiveUrl ? (
        <a className="rv-interactive-link" href={interactiveUrl} target="_blank" rel="noopener noreferrer">Ouvrir la maquette interactive ↗</a>
      ) : page.id === id && page.error ? (
        <div role="alert">
          <p>{page.error}</p>
          {interactiveUrl && <a href={interactiveUrl} target="_blank" rel="noopener noreferrer">Ouvrir la maquette interactive ↗</a>}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            Réessayer
          </button>
        </div>
      ) : (
        <output>Chargement de la page…</output>
      )}
    </div>
  );
}
