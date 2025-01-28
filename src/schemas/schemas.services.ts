import { Effect as E, pipe } from "effect";
import type { UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { ServiceError } from "#/common/app-error";
import type { NilDid } from "#/common/nil-did";
import { validateSchema } from "#/common/validator";
import * as DataRepository from "#/data/data.repository";
import type { Context } from "#/env";
import * as OrganizationRepository from "#/organizations/organizations.repository";
import type { AddSchemaRequest } from "#/schemas/schemas.types";
import type { SchemaDocument } from "./schemas.repository";
import * as SchemasRepository from "./schemas.repository";

export function getOrganizationSchemas(
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

export function addSchema(
  ctx: Context,
  request: AddSchemaRequest & { owner: NilDid },
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

export function deleteSchema(
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
