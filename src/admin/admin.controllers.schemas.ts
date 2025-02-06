import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import type { App } from "#/app";
import { foldToApiResponse, handleTaggedErrors } from "#/common/handler";
import { PathsBeta, PathsV1 } from "#/common/paths";
import { Uuid, type UuidDto } from "#/common/types";
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
        E.map(() => c.text("", StatusCodes.CREATED)),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function deleteIndex(app: App): void {
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
        E.map(() => c.text("", StatusCodes.OK)),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}
