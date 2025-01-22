import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import type { SchemaDocument } from "./repository";
import * as SchemasService from "./service";

export type ListSchemasResponse = ApiResponse<SchemaDocument[]>;

export const listSchemas: RequestHandler<
  EmptyObject,
  ListSchemasResponse
> = async (req, res) => {
  const { ctx } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    SchemasService.getOrganizationSchemas(ctx, account),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const AddSchemaRequest = z.object({
  _id: Uuid,
  name: z.string().min(1),
  keys: z.array(z.string()),
  schema: z.record(z.string(), z.unknown()),
});
export type AddSchemaRequest = z.infer<typeof AddSchemaRequest>;
export type AddSchemaResponse = ApiResponse<UuidDto>;

export const addSchema: RequestHandler<
  EmptyObject,
  AddSchemaResponse,
  AddSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<AddSchemaRequest>(() => AddSchemaRequest.parse(body)),
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
