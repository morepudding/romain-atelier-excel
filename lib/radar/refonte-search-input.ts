import { z } from 'zod';

export const refonteSearchInput = z
  .object({
    radiusKm: z.coerce.number().int().min(5).max(50).default(35),
  })
  .strict();
