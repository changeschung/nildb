import { z } from "zod";
import { Uuid } from "#/common/types";
/**
 *
 * Controller types
 */
export const AddSchemaRequestSchema = z.object({
  _id: Uuid,
  name: z.string().min(1),
  keys: z.array(z.string()),
  schema: z.record(z.string(), z.unknown()),
});
export type AddSchemaRequest = z.infer<typeof AddSchemaRequestSchema>;
