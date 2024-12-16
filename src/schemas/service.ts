import { Effect as E, pipe } from "effect";
import type { UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import type { ServiceError } from "#/common/error";
import type { DbError } from "#/common/errors";
import { validateSchema } from "#/common/validator";
import { dataCreateCollection, dataDeleteCollection } from "#/data/repository";
import type { Context } from "#/env";
import {
  organizationsAddSchema,
  organizationsRemoveSchema,
} from "#/organizations/repository";
import type { AddSchemaRequest } from "#/schemas/controllers";
import {
  type SchemaDocument,
  schemasDeleteOne,
  schemasFindMany,
  schemasInsert,
} from "#/schemas/repository";

export function getOrganizationSchemas(
  ctx: Context,
  organization: OrganizationAccountDocument,
): E.Effect<SchemaDocument[], ServiceError> {
  return pipe(
    E.succeed(organization._id),
    E.flatMap((owner) => schemasFindMany(ctx, { owner })),
  );
}

export function addSchema(
  ctx: Context,
  request: AddSchemaRequest,
): E.Effect<UUID, Error | DbError> {
  return pipe(
    validateSchema(request.schema),
    E.flatMap(() => schemasInsert(ctx, request)),
    E.tap((schemaId) => {
      return dataCreateCollection(ctx, schemaId, request.keys);
    }),
    E.tap((schemaId) => {
      return organizationsAddSchema(ctx, request.owner, schemaId);
    }),
  );
}

export function deleteSchema(
  ctx: Context,
  schemaId: UUID,
): E.Effect<SchemaDocument, ServiceError> {
  return pipe(
    schemasDeleteOne(ctx, { _id: schemaId }),
    E.tap((schema) => {
      return organizationsRemoveSchema(ctx, schema.owner, schemaId);
    }),
    E.tap((_orgId) => {
      return dataDeleteCollection(ctx, schemaId);
    }),
  );
}
