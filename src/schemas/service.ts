import { Effect as E, pipe } from "effect";
import type { UUID } from "mongodb";
import type { DbError } from "#/common/errors";
import { validateSchema } from "#/common/validator";
import { dataCreateCollection } from "#/data/repository";
import type { Context } from "#/env";
import { organizationsAddSchema } from "#/organizations/repository";
import type { AddSchemaRequest } from "#/schemas/controllers";
import { schemasInsert } from "#/schemas/repository";

export function addSchemaToOrganization(
  context: Context,
  request: AddSchemaRequest,
): E.Effect<UUID, Error | DbError> {
  return pipe(
    validateSchema(request.schema),
    E.flatMap(() => schemasInsert(context.db.primary, request)),
    E.tap((schemaId) => {
      return dataCreateCollection(context.db.data, schemaId, request.keys);
    }),
    E.tap((schemaId) => {
      return organizationsAddSchema(context.db.primary, request.org, schemaId);
    }),
  );
}
