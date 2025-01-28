import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { Uuid, type UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import type { SchemaDocument } from "./schemas.repository";
import * as SchemasService from "./schemas.services";
import { type AddSchemaRequest, AddSchemaRequestSchema } from "./schemas.types";

export const listSchemas: RequestHandler<
  EmptyObject,
  ApiResponse<SchemaDocument[]>
> = async (req, res) => {
  const { ctx } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    SchemasService.getOrganizationSchemas(ctx, account),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const addSchema: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  AddSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<AddSchemaRequest>(() => AddSchemaRequestSchema.parse(body)),
    E.flatMap((payload) =>
      SchemasService.addSchema(ctx, {
        ...payload,
        owner: account._id,
      }),
    ),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const DeleteSchemaRequestSchema = z.object({
  id: Uuid,
});
export type DeleteSchemaRequest = z.infer<typeof DeleteSchemaRequestSchema>;

export const deleteSchema: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  DeleteSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<DeleteSchemaRequest>(() =>
      DeleteSchemaRequestSchema.parse(body),
    ),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.id, payload),
    ),
    E.flatMap((payload) => SchemasService.deleteSchema(ctx, payload.id)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
