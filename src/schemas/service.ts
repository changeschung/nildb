import { Effect as E, pipe } from "effect";
import type { UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import type { AddSchemaRequest } from "#/admin/controllers";
import { ServiceError } from "#/common/app-error";
import { validateSchema } from "#/common/validator";
import { DataRepository } from "#/data/repository";
import type { Context } from "#/env";
import { OrganizationRepository } from "#/organizations/repository";
import { type SchemaDocument, SchemasRepository } from "#/schemas/repository";

function getOrganizationSchemas(
  ctx: Context,
  organization: OrganizationAccountDocument,
): E.Effect<SchemaDocument[], ServiceError> {
  return pipe(
    E.succeed(organization._id),
    E.flatMap((owner) => SchemasRepository.findMany(ctx, { owner })),
    E.mapError((cause) => {
      const reason = [`Get organization schemas failed: ${organization._id}`];
      return new ServiceError({ reason, cause });
    }),
  );
}

function addSchema(
  ctx: Context,
  request: AddSchemaRequest,
): E.Effect<UUID, ServiceError> {
  return pipe(
    validateSchema(request.schema),
    E.flatMap(() => {
      const now = new Date();
      const document: SchemaDocument = {
        ...request,
        _created: now,
        _updated: now,
      };
      return SchemasRepository.insert(ctx, document);
    }),
    E.tap((schemaId) => {
      return DataRepository.createCollection(ctx, schemaId, request.keys);
    }),
    E.tap((schemaId) => {
      return OrganizationRepository.addSchema(ctx, request.owner, schemaId);
    }),
    E.mapError((cause) => {
      const reason = [`Add schema failed: ${request.schema.toString()}`];
      return new ServiceError({ reason, cause });
    }),
  );
}

function deleteSchema(
  ctx: Context,
  schemaId: UUID,
): E.Effect<SchemaDocument, ServiceError> {
  return pipe(
    SchemasRepository.deleteOne(ctx, { _id: schemaId }),
    E.tap((schema) => {
      return OrganizationRepository.removeSchema(ctx, schema.owner, schemaId);
    }),
    E.tap((_orgId) => {
      return DataRepository.deleteCollection(ctx, schemaId);
    }),
    E.mapError((cause) => {
      const reason = [`Delete schema failed: ${schemaId.toString()}`];
      return new ServiceError({ reason, cause });
    }),
  );
}

export const SchemasService = {
  addSchema,
  deleteSchema,
  getOrganizationSchemas,
};
