import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { Uuid, type UuidDto } from "#/common/types";
import { isAccountAllowedGuard } from "#/middleware/auth";
import type { SchemaDocument } from "#/schemas/repository";
import { addSchema, deleteSchema, getOrganizationSchemas } from "./service";

export type ListSchemasResponse = ApiResponse<SchemaDocument[]>;

export const listSchemasController: RequestHandler<
  EmptyObject,
  ListSchemasResponse
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.succeed(req.account as OrganizationAccountDocument),
    E.flatMap((account) => getOrganizationSchemas(req.ctx, account)),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
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

export const addSchemaController: RequestHandler<
  EmptyObject,
  AddSchemaResponse,
  AddSchemaRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => AddSchemaRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => addSchema(req.ctx, body)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteSchemaRequest = z.object({
  id: Uuid,
});
export type DeleteSchemaRequest = z.infer<typeof DeleteSchemaRequest>;
export type DeleteSchemaResponse = ApiResponse<UuidDto>;

export const deleteSchemaController: RequestHandler<
  EmptyObject,
  DeleteSchemaResponse,
  DeleteSchemaRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => DeleteSchemaRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => deleteSchema(req.ctx, body.id)),
    E.map((schema) => schema._id.toString() as UuidDto),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};
