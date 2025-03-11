import { Effect as E, pipe } from "effect";
import type { JsonObject } from "type-fest";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import type { DocumentBase } from "#/common/mongo";
import type { AppBindings } from "#/env";
import { bestBreakingEfficiencyFinal } from "#/queries/hotfix/best-breaking-efficiency";
import { leastIdleTimeQuery } from "#/queries/hotfix/least-idle-time";
import { mostActiveCountryFinal } from "#/queries/hotfix/most-active-country";
import { mostActiveDriversFinal } from "#/queries/hotfix/most-active-drivers";
import { mostEcoFriendlyQuery } from "#/queries/hotfix/most-eco-friendly";
import { mostEfficientCountryFinal } from "#/queries/hotfix/most-efficient-country";
import { mostEfficientDriversFinal } from "#/queries/hotfix/most-efficient-drivers";
import { smoothestCorneringFinal } from "#/queries/hotfix/smoothest-cornering";
import type { QueryDocument } from "#/queries/queries.types";

// If results is defined then return it else run the pipeline
type Hotfix =
  | {
      _type: "completed";
      results: JsonObject[];
    }
  | {
      _type: "live";
      pipeline: Record<string, unknown>[];
    };

const targets = new Map<string, Hotfix>([
  // document count
  ["2bc729c8-673d-469d-8992-54c27f4c7f39", { _type: "live", pipeline: [] }],

  // most efficient drivers
  [
    "9ba0b643-7f6b-4c13-8682-f729bd913f99",
    { _type: "completed", results: mostEfficientDriversFinal },
  ],

  // most efficient country
  [
    "430d7add-07ee-485f-bb31-5986634340bf",
    { _type: "completed", results: mostEfficientCountryFinal },
  ],

  // most active drivers
  [
    "6def823f-1845-4310-b3f5-b5a155063291",
    { _type: "completed", results: mostActiveDriversFinal },
  ],

  // Most active country
  [
    "57d5a13f-253d-4949-8f1e-d4b62d36b0ae",
    { _type: "completed", results: mostActiveCountryFinal },
  ],

  // Best braking efficiency
  [
    "22892020-6b84-43ac-a79f-6ad84182124c",
    { _type: "completed", results: bestBreakingEfficiencyFinal },
  ],

  // Smoothest cornering
  [
    "0d155f33-ed17-4a20-8dd7-bf812f0b0158",
    { _type: "completed", results: smoothestCorneringFinal },
  ],

  // eco friendly drivers
  [
    "29383e81-2c78-4dcd-91c9-9abbae745011",
    {
      _type: "live",
      pipeline: mostEcoFriendlyQuery,
    },
  ],

  // least idle time
  [
    "66120601-d41f-4a07-84d0-45195f54c524",
    {
      _type: "live",
      pipeline: leastIdleTimeQuery,
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
        throw new Error(`Unknown query: ${queryId}`);
      }

      if (target._type === "completed") {
        return target.results;
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
