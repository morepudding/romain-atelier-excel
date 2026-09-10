'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RadarCompany } from '@/lib/radar/types';
import type { CompanyResearch } from '@/lib/radar/research-types';

export type ResearchState = {
  status: 'waiting' | 'loading' | 'done' | 'error';
  data?: CompanyResearch;
  error?: string;
};

export function useCompanyResearch(accessToken?: string) {
  const [items, setItems] = useState<Record<string, ResearchState>>({});
  const generation = useRef(0);
  const controller = useRef(new AbortController());
  useEffect(() => () => controller.current.abort(), []);

  const reset = useCallback(() => {
    generation.current += 1;
    controller.current.abort();
    controller.current = new AbortController();
    setItems({});
  }, []);

  const research = useCallback(
    async (company: RadarCompany, website?: string) => {
      const current = generation.current;
      const signal = AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(50_000),
      ]);
      setItems((old) => ({
        ...old,
        [company.siren]: {
          ...old[company.siren],
          status: 'loading',
          error: undefined,
        },
      }));
      try {
        const { research: _savedResearch, ...identity } = company;
        const response = await fetch('/api/radar/research', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            company: identity,
            ...(website ? { website } : {}),
          }),
          signal,
        });
        const payload = (await response.json()) as CompanyResearch & {
          error?: string;
        };
        if (!response.ok)
          throw new Error(payload.error || 'Recherche indisponible.');
        if (current === generation.current)
          setItems((old) => ({
            ...old,
            [company.siren]: { status: 'done', data: payload },
          }));
      } catch (error) {
        if (current !== generation.current || controller.current.signal.aborted)
          return;
        setItems((old) => ({
          ...old,
          [company.siren]: {
            ...old[company.siren],
            status: 'error',
            error:
              error instanceof Error && error.name === 'TimeoutError'
                ? 'Le site met trop de temps à répondre. Réessayez ou indiquez son adresse.'
                : error instanceof TypeError
                  ? 'Impossible de joindre le radar. Réessayez dans quelques instants.'
                  : error instanceof Error
                    ? error.message
                    : 'Recherche indisponible.',
          },
        }));
      }
    },
    [accessToken],
  );

  const researchAll = useCallback(
    async (companies: RadarCompany[]) => {
      const current = generation.current;
      setItems(
        Object.fromEntries(
          companies.map((company) => [company.siren, { status: 'waiting' }]),
        ),
      );
      let next = 0;
      async function worker() {
        while (
          next < companies.length &&
          current === generation.current &&
          !controller.current.signal.aborted
        ) {
          const company = companies[next++];
          await research(company);
        }
      }
      await Promise.all([worker(), worker()]);
    },
    [research],
  );

  return {
    items,
    research,
    researchAll,
    reset,
    running: Object.values(items).some(
      (item) => item.status === 'loading' || item.status === 'waiting',
    ),
  };
}
