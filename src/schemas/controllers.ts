import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { Uuid, type UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import { isRoleAllowed } from "#/middleware/auth";
import type { SchemaDocument } from "#/schemas/repository";
import { SchemasService } from "./service";

export type ListSchemasResponse = ApiResponse<SchemaDocument[]>;

export const listSchemas: RequestHandler<
  EmptyObject,
  ListSchemasResponse
> = async (req, res) => {
  const { ctx } = req;

  if (!isRoleAllowed(req, ["organization"])) {
    res.sendStatus(401);
    return;
  }
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    SchemasService.getOrganizationSchemas(ctx, account),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const AddSchemaRequest = z.object({
  _id: Uuid,
  owner: NilDid,
  name: z.string().min(1),
  keys: z.array(z.string()),
  schema: z.record(z.string(), z.unknown()),
});
export type AddSchemaRequest = z.infer<typeof AddSchemaRequest>;
export type AddSchemaResponse = ApiResponse<UuidDto>;

const addSchema: RequestHandler<
  EmptyObject,
  AddSchemaResponse,
  AddSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    parseUserData<AddSchemaRequest>(() => AddSchemaRequest.parse(body)),
    E.flatMap((payload) => SchemasService.addSchema(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const DeleteSchemaRequest = z.object({
  id: Uuid,
});
export type DeleteSchemaRequest = z.infer<typeof DeleteSchemaRequest>;
export type DeleteSchemaResponse = ApiResponse<UuidDto>;

const deleteSchema: RequestHandler<
  EmptyObject,
  DeleteSchemaResponse,
  DeleteSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    parseUserData<DeleteSchemaRequest>(() => DeleteSchemaRequest.parse(body)),
    E.flatMap((payload) => SchemasService.deleteSchema(ctx, payload.id)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const SchemasController = {
  addSchema,
  deleteSchema,
  listSchemas,
};
