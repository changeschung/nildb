import { Effect as E, Option as O, pipe } from "effect";
import type { StrictFilter, StrictUpdateFilter } from "mongodb";
import type { AdminSetMaintenanceWindowRequest } from "#/admin/admin.types";
import {
  DatabaseError,
  DocumentNotFoundError,
  type PrimaryCollectionNotFoundError,
} from "#/common/errors";
import { CollectionName, checkPrimaryCollectionExists } from "#/common/mongo";
import type { AppBindings } from "#/env";
import type { MaintenanceDocument } from "./system.types";

export function setMaintenanceWindow(
  ctx: AppBindings,
  data: AdminSetMaintenanceWindowRequest,
): E.Effect<
  boolean,
  PrimaryCollectionNotFoundError | DatabaseError | DocumentNotFoundError
> {
  const filter: StrictFilter<MaintenanceDocument> = { _id: data.id };
  const update: StrictUpdateFilter<MaintenanceDocument> = {
    $set: { window: { start: data.start, end: data.end } },
  };

  return pipe(
    checkPrimaryCollectionExists<MaintenanceDocument>(
      ctx,
      CollectionName.Maintenance,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () =>
          collection.updateOne(filter, update, {
            upsert: true,
          }),
        catch: (cause) =>
          new DatabaseError({ cause, message: "setMaintenanceWindow" }),
      }),
    ),
    E.flatMap((result) =>
      result.upsertedCount === 1 || result.matchedCount === 1
        ? O.some(true)
        : O.none(),
    ),
    E.mapError(
      () =>
        new DocumentNotFoundError({
          collection: CollectionName.Maintenance,
          filter,
        }),
    ),
  );
}

export function findMaintenanceWindow(
  ctx: AppBindings,
): E.Effect<
  MaintenanceDocument["window"] | null,
  PrimaryCollectionNotFoundError | DatabaseError
> {
  const filter: StrictFilter<MaintenanceDocument> = {
    _id: ctx.node.identity.did,
  };

  return pipe(
    checkPrimaryCollectionExists<MaintenanceDocument>(
      ctx,
      CollectionName.Maintenance,
    ),
    E.flatMap((collection) =>
      E.tryPromise({
        try: () => collection.findOne(filter),
        catch: (cause) =>
          new DatabaseError({ cause, message: "findMaintenanceWindow" }),
      }),
    ),
    E.flatMap((result) => O.fromNullable(result?.window)),
    E.mapError(
      () =>
        new DocumentNotFoundError({
          collection: CollectionName.Maintenance,
          filter,
        }),
    ),
    E.catchTag("DocumentNotFoundError", () => E.succeed(null)),
  );
}
