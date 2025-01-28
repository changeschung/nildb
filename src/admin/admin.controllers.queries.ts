import { zValidator } from "@hono/zod-validator";
import { Effect as E, pipe } from "effect";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import * as QueriesService from "#/queries/queries.services";
import {
  DeleteQueryRequestSchema,
  ExecuteQueryRequestSchema,
} from "#/queries/queries.types";
import { AdminAddQueryRequestSchema } from "./admin.types";

export function add(app: App): void {
  app.post(
    PathsV1.admin.queries.root,
    zValidator("json", AdminAddQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.addQuery(c.env, payload),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function deleteQ(app: App): void {
  app.delete(
    PathsV1.admin.queries.root,
    zValidator("json", DeleteQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.removeQuery(c.env, payload.id),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function execute(app: App): void {
  app.post(
    PathsV1.admin.queries.execute,
    zValidator("json", ExecuteQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        QueriesService.executeQuery(c.env, payload),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}
