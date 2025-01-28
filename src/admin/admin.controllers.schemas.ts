import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import {
  type DeleteSchemaRequest,
  DeleteSchemaRequestSchema,
} from "#/schemas/schemas.controllers";
import * as SchemasService from "#/schemas/schemas.services";
import {
  type AdminAddSchemaRequest,
  AdminAddSchemaRequestSchema,
} from "./admin.types";

export const addSchema: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  AdminAddSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<AdminAddSchemaRequest>(() =>
      AdminAddSchemaRequestSchema.parse(body),
    ),
    E.flatMap((payload) => SchemasService.addSchema(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const deleteSchema: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  DeleteSchemaRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<DeleteSchemaRequest>(() =>
      DeleteSchemaRequestSchema.parse(body),
    ),
    E.flatMap((payload) => SchemasService.deleteSchema(ctx, payload.id)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
