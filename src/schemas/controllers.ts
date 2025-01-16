import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { SchemaDocument } from "#/schemas/repository";
import { SchemasService } from "./service";

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

export const SchemasController = {
  listSchemas,
};
