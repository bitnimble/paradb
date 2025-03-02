import { z } from 'zod';
import { useTypedParse } from 'schema/api_zod';

// TODO: rename to pdMap once the non-zod schema types have been migrated fully.
export const pdMapZod = z.object({
  id: z.string(),
  submissionDate: z.date(),
  title: z.string(),
  artist: z.string(),
  author: z.string().nullish(),
  uploader: z.string(),
  downloadCount: z.number(),
  albumArt: z.string().nullish(),
  // complexity is temporarily `nullish` while we perform the migration and rescan all rlrr's.
  complexity: z.number().nullish(),
  // TODO: difficulties
  description: z.string().nullish(),
  favorites: z.number(),
  // TODO: requesting user metadata / projection
});

// Fields in this advanced search are AND'ed together
export const AdvancedSearchMapRequest = useTypedParse(
  z.object({
    title: z.string().nullish(),
    artist: z.string().nullish(),
    uploader: z.string().nullish(),
    submissionDateStart: z.date().nullish(),
    submissionDateEnd: z.date().nullish(),
  })
);
export const AdvancedSearchMapResponse = useTypedParse(
  z.object({
    success: z.literal(true),
    maps: z.array(pdMapZod),
  })
);

export type AdvancedSearchMapRequest = z.infer<typeof AdvancedSearchMapRequest>;
export type AdvancedSearchMapsResponse = z.infer<typeof AdvancedSearchMapResponse>;
