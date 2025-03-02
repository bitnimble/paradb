import { z } from 'zod';

type TypedParseSchema<Schema extends z.ZodSchema> = Omit<Schema, 'parse'> & {
  parse(data: z.infer<Schema>): z.infer<Schema>;
};
export const useTypedParse = <Schema extends z.ZodSchema>(
  schema: Schema
): TypedParseSchema<Schema> => schema;

export const ZodApiError = useTypedParse(
  z.object({
    success: z.literal(false),
    statusCode: z.number(),
    errorMessage: z.string().nullish(),
  })
);

export type ZodApiError = z.infer<typeof ZodApiError>;
