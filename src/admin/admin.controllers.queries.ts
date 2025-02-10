import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
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

      return pipe(
        QueriesService.addQuery(c.env, payload),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function remove(app: App): void {
  app.delete(
    PathsV1.admin.queries.root,
    payloadValidator(DeleteQueryRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        QueriesService.removeQuery(c.env, payload.id),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
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

      return pipe(
        QueriesService.executeQuery(c.env, payload),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}
