import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { PathsBeta, PathsV1 } from "#/common/paths";
import { Uuid } from "#/common/types";
import { paramsValidator, payloadValidator } from "#/common/zod-utils";
import * as SchemasService from "#/schemas/schemas.services";
import { DeleteSchemaRequestSchema } from "#/schemas/schemas.types";
import {
  AdminAddSchemaRequestSchema,
  CreateSchemaIndexRequestSchema,
} from "./admin.types";

export function add(app: App): void {
  app.post(
    PathsV1.admin.schemas.root,
    payloadValidator(AdminAddSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        SchemasService.addSchema(c.env, payload),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function remove(app: App): void {
  app.delete(
    PathsV1.admin.schemas.root,
    payloadValidator(DeleteSchemaRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        SchemasService.deleteSchema(c.env, payload.id),
        E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function metadata(app: App): void {
  app.get(
    PathsBeta.admin.schemas.byIdMeta,
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const payload = c.req.valid("param");

      return pipe(
        SchemasService.getSchemaMetadata(c.env, payload.id),
        E.map((data) =>
          c.json({
            data,
          }),
        ),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function createIndex(app: App): void {
  app.post(
    PathsBeta.admin.schemas.byIdIndexes,
    payloadValidator(CreateSchemaIndexRequestSchema),
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const payload = c.req.valid("json");
      const { id } = c.req.valid("param");

      return pipe(
        SchemasService.createIndex(c.env, id, payload),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function dropIndex(app: App): void {
  app.delete(
    PathsBeta.admin.schemas.byIdIndexesByName,
    paramsValidator(
      z.object({
        id: Uuid,
        indexName: z.string().min(4),
      }),
    ),
    async (c) => {
      const { id, indexName } = c.req.valid("param");

      return pipe(
        SchemasService.dropIndex(c.env, id, indexName),
        E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}
