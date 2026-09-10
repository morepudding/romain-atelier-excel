import { z } from 'zod';
import { publicUrl } from './public-page.ts';

export const researchInput = z.object({
  company: z.object({
    siren: z.string().regex(/^\d{9}$/),
    nom: z.string().trim().min(2).max(300),
    commune: z.string().trim().min(2).max(100),
    codePostal: z.string().regex(/^\d{5}$/),
    distanceKm: z.number().min(0).max(100),
    activiteCode: z.string().max(30),
    activiteLibelle: z.string().max(200),
    trancheEffectif: z.string().max(100),
    nombreEtablissements: z.number().int().min(0).max(10000),
    niveauPriorite: z.enum(['Prioritaire', 'Intéressante', 'À vérifier']),
    raisonSelection: z.string().max(1000),
    workflowProbable: z.string().max(1000),
    sourceUrl: z.string().max(500),
  }),
  website: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((value) => value || undefined)
    .refine((value) => {
      if (!value) return true;
      try {
        publicUrl(value);
        return true;
      } catch {
        return false;
      }
    }, 'Indiquez l’adresse complète d’un site public, commençant par https://.'),
});
