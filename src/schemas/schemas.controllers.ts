import { zValidator } from "@hono/zod-validator";
import { Effect as E, pipe } from "effect";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { PathsV1 } from "#/common/paths";
import * as SchemasService from "./schemas.services";
import {
  AddSchemaRequestSchema,
  DeleteSchemaRequestSchema,
} from "./schemas.types";

export function listSchemas(app: App): void {
  app.get(PathsV1.schemas.root, async (c): Promise<Response> => {
    const account = c.var.account as OrganizationAccountDocument;

    return await pipe(
      SchemasService.getOrganizationSchemas(c.env, account),
      foldToApiResponse(c),
      E.runPromise,
    );
  });
}

export function addSchema(app: App): void {
  app.post(
    PathsV1.schemas.root,
    zValidator("json", AddSchemaRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        SchemasService.addSchema(c.env, {
          ...payload,
          owner: account._id,
        }),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function deleteSchema(app: App): void {
  app.delete(
    PathsV1.schemas.root,
    zValidator("json", DeleteSchemaRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.id, payload),
        E.flatMap((payload) => SchemasService.deleteSchema(c.env, payload.id)),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}
