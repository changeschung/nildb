import { Effect as E, pipe } from "effect";
import type { JsonObject } from "type-fest";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import type { DocumentBase } from "#/common/mongo";
import type { AppBindings } from "#/env";
import type { QueryDocument } from "#/queries/queries.types";
import { breakingEfficiency } from "./query-breaking";
import { smoothestCornering } from "./query-cornering";

const targets = new Map([
  [
    "2bc729c8-673d-469d-8992-54c27f4c7f39",
    { description: "Document Count", pipeline: [] },
  ],
  [
    "22892020-6b84-43ac-a79f-6ad84182124c",
    {
      description: "Week 2 - Breaking Efficiency",
      pipeline: breakingEfficiency,
    },
  ],
  [
    "0d155f33-ed17-4a20-8dd7-bf812f0b0158",
    {
      description: "Week 3 - Smoothest Cornering",
      pipeline: smoothestCornering,
    },
  ],
]);

export function isSoarchainHotFixedQuery(query: QueryDocument): boolean {
  return targets.has(query._id.toString());
}

export function runSoarchainHotFixedQuery(
  ctx: AppBindings,
  query: QueryDocument,
): E.Effect<JsonObject[], RepositoryError> {
  return pipe(
    E.tryPromise(async () => {
      const collection = ctx.db.data.collection<DocumentBase>(
        query.schema.toString(),
      );
      const queryId = query._id.toString();

      // 'Document Count'
      if (queryId === "2bc729c8-673d-469d-8992-54c27f4c7f39") {
        const total_documents = await collection.estimatedDocumentCount();
        return [{ total_documents }];
      }

      const target = targets.get(queryId);
      if (!target) {
        throw new Error(`Unknown optimised query: ${queryId}`);
      }

      return ctx.db.data
        .collection<DocumentBase>(query.schema.toString())
        .aggregate(target.pipeline)
        .toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.runAggregation",
      query: query._id,
    }),
  );
}
