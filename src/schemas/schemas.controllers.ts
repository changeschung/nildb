import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import { Temporal } from "temporal-polyfill";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { PathsBeta, PathsV1 } from "#/common/paths";
import { Uuid, type UuidDto } from "#/common/types";
import { paramsValidator, payloadValidator } from "#/common/zod-utils";
import type { SchemaDocument } from "#/schemas/schemas.repository";
import * as SchemasService from "./schemas.services";
import {
  AddSchemaRequestSchema,
  DeleteSchemaRequestSchema,
} from "./schemas.types";

export function list(app: App): void {
  app.get(PathsV1.schemas.root, async (c): Promise<Response> => {
    const account = c.var.account as OrganizationAccountDocument;

    return await pipe(
      SchemasService.getOrganizationSchemas(c.env, account),
      foldToApiResponse<SchemaDocument[]>(c),
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

      return await pipe(
        SchemasService.addSchema(c.env, {
          ...payload,
          owner: account._id,
        }),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function deleteS(app: App): void {
  app.delete(
    PathsV1.schemas.root,
    payloadValidator(DeleteSchemaRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return pipe(
        enforceSchemaOwnership(account, payload.id, payload),
        E.flatMap((payload) => SchemasService.deleteSchema(c.env, payload.id)),
        E.map((id) => id.toString() as UuidDto),
        foldToApiResponse<UuidDto>(c),
        E.runPromise,
      );
    },
  );
}

export function metadata(app: App) {
  app.get(
    PathsBeta.schemas.byId,
    paramsValidator(
      z.object({
        id: Uuid,
      }),
    ),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("param");

      return pipe(
        enforceSchemaOwnership(account, payload.id, payload),
        E.flatMap(() => SchemasService.getSchemaMetadata(c.env, payload.id)),
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
