import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { PathsBeta, PathsV1 } from "#/common/paths";
import { Uuid, type UuidDto } from "#/common/types";
import { paramsValidator, payloadValidator } from "#/common/zod-utils";
import * as SchemasService from "#/schemas/schemas.services";
import { DeleteSchemaRequestSchema } from "#/schemas/schemas.types";
import { AdminAddSchemaRequestSchema } from "./admin.types";

export function add(app: App): void {
  app.post(
    PathsV1.admin.schemas.root,
    payloadValidator(AdminAddSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        SchemasService.addSchema(c.env, payload),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function deleteS(app: App): void {
  app.delete(
    PathsV1.admin.schemas.root,
    payloadValidator(DeleteSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return await pipe(
        SchemasService.deleteSchema(c.env, payload.id),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function metadata(app: App): void {
  app.get(
    PathsBeta.admin.schemas.byId,
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const payload = c.req.valid("param");

      return await pipe(
        SchemasService.getSchemaMetadata(c.env, payload.id),
        E.map((data) => {
          return c.json({
            data,
          });
        }),
        E.catchTag("SchemaNotFoundError", (e) => {
          c.env.log.debug("Request failed metadata: %O", e);
          return E.succeed(
            c.json(
              {
                ts: Temporal.Now.instant().toString(),
                error: ["SchemaNotFoundError"],
              },
              StatusCodes.NOT_FOUND,
            ),
          );
        }),
        E.catchAll((e) => {
          c.env.log.debug("Request failed metadata: %O", e);
          return E.succeed(
            c.json(
              {
                ts: Temporal.Now.instant().toString(),
                error: ["Internal Server Error"],
              },
              StatusCodes.INTERNAL_SERVER_ERROR,
            ),
          );
        }),
        E.runPromise,
      );
    },
  );
}
