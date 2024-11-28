import Ajv from "ajv";
import addFormats from "ajv-formats";
import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import { UUID } from "mongodb";
import type { EmptyObject, JsonObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { Uuid, type UuidDto } from "#/common/types";
import { DataRepository } from "#/data/repository";
import { OrganizationsRepository } from "#/organizations/repository";
import { type SchemaBase, SchemasRepository } from "#/schemas/repository";

export const AddSchemaRequest = z.object({
  org: Uuid,
  name: z.string().min(1),
  keys: z.array(z.string()),
  schema: z.record(z.string(), z.unknown()),
});
export type AddSchemaRequest = {
  org: UuidDto;
  name: string;
  keys: string[];
  schema: JsonObject;
};
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

    E.flatMap((body) => {
      try {
        const ajv = new Ajv({ strict: false });
        addFormats(ajv);
        // Compile throws on invalid schemas
        ajv.compile(body.schema);
        return E.succeed(body);
      } catch (error) {
        return E.fail(
          new Error("Schema failed compilation check", { cause: error }),
        );
      }
    }),

    E.flatMap((body) =>
      pipe(
        SchemasRepository.create(req.context.db.primary, body),
        E.tap((schemaId) => {
          return DataRepository.createCollection(
            req.context.db.data,
            schemaId,
            body.keys,
          );
        }),
        E.tap((schemaId) => {
          return OrganizationsRepository.addSchemaId(
            req.context.db.primary,
            body.org,
            schemaId,
          );
        }),
      ),
    ),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export type ListSchemasResponse = ApiResponse<SchemaBase[]>;

export const listSchemasController: RequestHandler<
  EmptyObject,
  ListSchemasResponse
> = async (req, res) => {
  const response = await pipe(
    E.fromNullable(req.user.sub), // here !!
    E.flatMap((org) => {
      return SchemasRepository.listOrganizationSchemas(
        req.context.db.primary,
        org,
      );
    }),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteSchemaRequest = z.object({
  id: Uuid,
});
export type DeleteSchemaRequest = { id: UuidDto };
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
        SchemasRepository.deleteBySchemaId(req.context.db.primary, body.id),
        E.tap((schema) => {
          return OrganizationsRepository.removeSchemaId(
            req.context.db.primary,
            schema.org,
            body.id,
          );
        }),
        E.tap((_orgId) => {
          return DataRepository.deleteCollection(req.context.db.data, body.id);
        }),
      ),
    ),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
