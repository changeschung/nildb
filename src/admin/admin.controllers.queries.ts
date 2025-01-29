import { Effect as E, pipe } from "effect";
import type { JsonValue } from "type-fest";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import type { UuidDto } from "#/common/types";
import { payloadValidator } from "#/common/zod-utils";
import * as QueriesService from "#/queries/queries.services";
import {
  DeleteQueryRequestSchema,
  ExecuteQueryRequestSchema,
} from "#/queries/queries.types";
import { AdminAddQueryRequestSchema } from "./admin.types";

export function add(app: App): void {
  app.post(
    PathsV1.admin.queries.root,
    payloadValidator(AdminAddQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.addQuery(c.env, payload),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function deleteQ(app: App): void {
  app.delete(
    PathsV1.admin.queries.root,
    payloadValidator(DeleteQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.removeQuery(c.env, payload.id),
        foldToApiResponse<boolean>(c),
        E.runPromise,
      );
    },
  );
}

export function execute(app: App): void {
  app.post(
    PathsV1.admin.queries.execute,
    payloadValidator(ExecuteQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.executeQuery(c.env, payload),
        foldToApiResponse<JsonValue>(c),
        E.runPromise,
      );
    },
  );
}
