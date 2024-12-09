import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import { dataDeleteCollection } from "#/data/repository";
import { organizationsRemoveSchema } from "#/organizations/repository";
import {
  type SchemaDocument,
  schemasDeleteOne,
  schemasFindMany,
} from "#/schemas/repository";
import { addSchemaToOrganization } from "./service";

export const AddSchemaRequest = z.object({
  org: Uuid,
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
  const response = await pipe(
    E.try({
      try: () => AddSchemaRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => addSchemaToOrganization(req.context, body)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export type ListSchemasResponse = ApiResponse<SchemaDocument[]>;

export const listSchemasController: RequestHandler<
  EmptyObject,
  ListSchemasResponse
> = async (req, res) => {
  const response = await pipe(
    E.fromNullable(req.user.id),
    E.flatMap((org) => {
      return schemasFindMany(req.context.db.primary, { org });
    }),
    foldToApiResponse(req.context),
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
  const response = await pipe(
    E.try({
      try: () => DeleteSchemaRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) =>
      pipe(
        schemasDeleteOne(req.context.db.primary, { _id: body.id }),
        E.tap((schema) => {
          return organizationsRemoveSchema(
            req.context.db.primary,
            schema.org,
            body.id,
          );
        }),
        E.tap((_orgId) => {
          return dataDeleteCollection(req.context.db.data, body.id);
        }),
      ),
    ),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
