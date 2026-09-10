import { z } from 'zod';
import { radarConfig } from './config.ts';

export const radarSearchInput = z
  .object({
    radiusKm: z.coerce.number().int().min(5).max(50).default(35),
    activitySections: z
      .array(z.enum(radarConfig.defaults.activitySections))
      .min(1)
      .max(7)
      .default([...radarConfig.defaults.activitySections]),
  })
  .strict();
