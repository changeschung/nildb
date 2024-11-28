import Ajv, { ValidationError } from "ajv";
import addFormats from "ajv-formats";
import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import { type Document, UUID } from "mongodb";
import type { EmptyObject, JsonArray } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { Uuid, type UuidDto } from "#/common/types";
import { SchemasRepository } from "#/schemas/repository";
import {
  type CreatedResult,
  DataRepository,
  type UpdateResult,
} from "./repository";

export const MAX_RECORDS_LENGTH = 10_000;

export const CreateDataRequest = z.object({
  schema: Uuid,
  data: z.array(z.record(z.unknown())),
});
export type CreateDataRequest = {
  schema: UuidDto;
  data: JsonArray;
};
export type CreateDataResponse = ApiResponse<CreatedResult>;

export const createDataController: RequestHandler<
  EmptyObject,
  CreateDataResponse,
  CreateDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => CreateDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) => {
      return body.data.length <= MAX_RECORDS_LENGTH
        ? E.succeed(body)
        : E.fail(
            new Error(`Max data length is ${MAX_RECORDS_LENGTH} elements`),
          );
    }),

    E.flatMap((body) =>
      pipe(
        E.Do,
        E.bind("schema", () =>
          SchemasRepository.find(req.context.db.primary, new UUID(body.schema)),
        ),
        E.bind("data", ({ schema }) => {
          const ajv = new Ajv({ strict: "log" });
          addFormats(ajv);

          const validator = ajv.compile(schema.schema);
          const valid = validator(body.data);

          return valid
            ? E.succeed(body.data as DocumentBase[])
            : E.fail(new ValidationError(validator.errors ?? []));
        }),
        E.flatMap(({ schema, data }) => {
          return DataRepository.insert(req.context.db.data, schema, data);
        }),
      ),
    ),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const ReadDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type ReadDataRequest = {
  schema: UuidDto;
  filter: Record<string, unknown>;
};
export type ReadDataResponse = ApiResponse<DocumentBase[]>;

export const readDataController: RequestHandler<
  EmptyObject,
  ReadDataResponse,
  ReadDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => ReadDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) =>
      DataRepository.find(req.context.db.data, body.schema, body.filter),
    ),

    E.map((data) => data),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const UpdateDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
  update: z.record(z.string(), z.unknown()),
});
export type UpdateDataRequest = {
  schema: UuidDto;
  filter: Record<string, unknown>;
  update: Record<string, unknown>;
};
export type UpdateDataResponse = ApiResponse<UpdateResult>;

export const updateDataController: RequestHandler<
  EmptyObject,
  UpdateDataResponse,
  UpdateDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => UpdateDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) =>
      DataRepository.update(
        req.context.db.data,
        body.schema,
        body.filter,
        body.update,
      ),
    ),

    E.map((data) => data),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type DeleteDataRequest = {
  schema: UuidDto;
  filter: Record<string, unknown>;
};
export type DeleteDataResponse = ApiResponse<number>;

export const deleteDataController: RequestHandler<
  EmptyObject,
  DeleteDataResponse,
  DeleteDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => DeleteDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) => {
      if (Object.keys(request.filter).length === 0)
        return E.fail(
          new Error(
            "Filter cannot be empty. Use /data/flush to remove all records from a collection.",
          ),
        );

      return E.succeed(request);
    }),

    E.flatMap((request) =>
      DataRepository.delete(
        req.context.db.data,
        request.schema,
        request.filter,
      ),
    ),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const FlushDataRequest = z.object({
  schema: Uuid,
});
export type FlushDataRequest = {
  schema: UuidDto;
};

export type FlushDataResponse = ApiResponse<number>;

export const flushDataController: RequestHandler<
  EmptyObject,
  FlushDataResponse,
  FlushDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => FlushDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) =>
      DataRepository.flush(req.context.db.data, request.schema),
    ),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const TailDataRequest = z.object({
  schema: Uuid,
});
export type TailDataRequest = {
  schema: UuidDto;
};

export type TailDataResponse = ApiResponse<JsonArray>;

export const tailDataController: RequestHandler<
  EmptyObject,
  TailDataResponse,
  TailDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => TailDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) => DataRepository.tail(req.context.db.data, body.schema)),

    E.map((data) => data as JsonArray),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
