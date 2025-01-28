import { zValidator } from "@hono/zod-validator";
import { Effect as E, pipe } from "effect";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import * as SchemasService from "#/schemas/schemas.services";
import { DeleteSchemaRequestSchema } from "#/schemas/schemas.types";
import { AdminAddSchemaRequestSchema } from "./admin.types";

export function add(app: App): void {
  app.post(
    PathsV1.admin.schemas.root,
    zValidator("json", AdminAddSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        SchemasService.addSchema(c.env, payload),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function deleteS(app: App): void {
  app.delete(
    PathsV1.admin.schemas.root,
    zValidator("json", DeleteSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        SchemasService.deleteSchema(c.env, payload.id),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}
