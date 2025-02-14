import { Effect as E, pipe } from "effect";
import type { JsonObject } from "type-fest";
import type { RepositoryError } from "#/common/app-error";
import { succeedOrMapToRepositoryError } from "#/common/errors";
import type { DocumentBase } from "#/common/mongo";
import type { AppBindings } from "#/env";
import type { QueryDocument } from "#/queries/queries.types";

export function isSoarchainHotFixedQuery(query: QueryDocument): boolean {
  const targets = [
    "2bc729c8-673d-469d-8992-54c27f4c7f39", // 'Document Count'
    "22892020-6b84-43ac-a79f-6ad84182124c", // 'Best Breaking Efficiency'
  ];
  return targets.includes(query._id.toString());
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
      // 'Document Count'
      if (query._id.toString() === "2bc729c8-673d-469d-8992-54c27f4c7f39") {
        const total_documents = await collection.estimatedDocumentCount();
        return [{ total_documents }];
      }

      // "22892020-6b84-43ac-a79f-6ad84182124c", // 'Best Breaking Efficiency'
      const pipeline = breakingEfficiency;

      return ctx.db.data
        .collection<DocumentBase>(query.schema.toString())
        .aggregate(pipeline)
        .toArray();
    }),
    succeedOrMapToRepositoryError({
      op: "DataRepository.runAggregation",
      query: query._id,
    }),
  );
}

// 22892020-6b84-43ac-a79f-6ad84182124c 'Best Breaking Efficiency'
const breakingEfficiency = [
  {
    $match: {
      ts: {
        $gte: new Date("2025-02-12T00:00:00Z"),
        $lt: new Date("2025-02-21T00:00:00Z"),
      },
      "data.accelerometer.z": { $exists: true, $ne: null },
    },
  },
  {
    $addFields: {
      numericZ: { $toDouble: "$data.accelerometer.z" },
    },
  },
  {
    $group: {
      _id: "$meta.pubKey",
      allZ: { $push: { ts: "$ts", z: "$numericZ" } },
      count: { $sum: 1 },
    },
  },
  {
    $match: {
      count: { $gte: 100 },
    },
  },
  {
    $project: {
      avgZ: { $avg: "$allZ.z" },
      variance: {
        $let: {
          vars: { mean: { $avg: "$allZ.z" } },
          in: {
            $avg: {
              $map: {
                input: "$allZ.z",
                as: "acc",
                in: {
                  $pow: [{ $subtract: ["$$acc", "$$mean"] }, 2],
                },
              },
            },
          },
        },
      },
    },
  },
  {
    $sort: { avgZ: 1, variance: 1 },
  },
  {
    $limit: 10,
  },
];
