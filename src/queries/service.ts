import { Effect as E, pipe } from "effect";
import type { UUID } from "mongodb";
import type { DbError } from "#/common/errors";
import { validateData } from "#/common/validator";
import type { Context } from "#/env";
import { organizationsAddQuery } from "#/organizations/repository";
import type { AddQueryRequest } from "#/queries/controllers";
import pipelineSchema from "#/queries/mongodb_pipeline.json";
import { queriesInsert } from "#/queries/repository";

export function addQueryToOrganization(
  context: Context,
  request: AddQueryRequest,
): E.Effect<UUID, Error | DbError> {
  return pipe(
    validateData(pipelineSchema, request.pipeline),
    E.flatMap(() => {
      return queriesInsert(context.db.primary, request);
    }),
    E.tap((queryId) => {
      return organizationsAddQuery(context.db.primary, request.org, queryId);
    }),
  );
}
