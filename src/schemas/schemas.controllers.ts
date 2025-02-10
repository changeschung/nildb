import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { CreateSchemaIndexRequestSchema } from "#/admin/admin.types";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { PathsBeta, PathsV1 } from "#/common/paths";
import { Uuid } from "#/common/types";
import { paramsValidator, payloadValidator } from "#/common/zod-utils";
import * as SchemasService from "./schemas.services";
import {
  AddSchemaRequestSchema,
  DeleteSchemaRequestSchema,
} from "./schemas.types";

export function list(app: App): void {
  app.get(PathsV1.schemas.root, async (c) => {
    const account = c.var.account as OrganizationAccountDocument;

    return pipe(
      SchemasService.getOrganizationSchemas(c.env, account),
      E.map((data) => c.json({ data })),
      handleTaggedErrors(c),
      E.runPromise,
    );
  });
}

export function add(app: App): void {
  app.post(
    PathsV1.schemas.root,
    payloadValidator(AddSchemaRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return pipe(
        SchemasService.addSchema(c.env, {
          ...payload,
          owner: account._id,
        }),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function remove(app: App): void {
  app.delete(
    PathsV1.schemas.root,
    payloadValidator(DeleteSchemaRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return pipe(
        enforceSchemaOwnership(account, payload.id),
        E.flatMap(() => SchemasService.deleteSchema(c.env, payload.id)),
        E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function metadata(app: App) {
  app.get(
    PathsBeta.schemas.byIdMeta,
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("param");

      return pipe(
        enforceSchemaOwnership(account, payload.id),
        E.flatMap(() => SchemasService.getSchemaMetadata(c.env, payload.id)),
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
    PathsBeta.schemas.byIdIndexes,
    payloadValidator(CreateSchemaIndexRequestSchema),
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");
      const { id } = c.req.valid("param");

      return pipe(
        enforceSchemaOwnership(account, id),
        E.flatMap(() => SchemasService.createIndex(c.env, id, payload)),
        E.map(() => new Response(null, { status: StatusCodes.CREATED })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function dropIndex(app: App): void {
  app.delete(
    PathsBeta.schemas.byIdIndexesByName,
    paramsValidator(
      z.object({
        id: Uuid,
        name: z.string().min(4),
      }),
    ),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const { id, name } = c.req.valid("param");

      return pipe(
        enforceSchemaOwnership(account, id),
        E.flatMap(() => SchemasService.dropIndex(c.env, id, name)),
        E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}
