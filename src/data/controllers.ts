import Ajv, { ValidationError } from "ajv";
import addFormats from "ajv-formats";
import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import { UUID } from "mongodb";
import type { EmptyObject, JsonArray } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import { SchemasRepository } from "#/schemas/repository";
import { DataRepository, type InsertResult } from "./repository";

export const MAX_RECORDS_LENGTH = 10_000;

export const UploadDataRequest = z.object({
  schema: Uuid,
  data: z.array(z.record(z.unknown())),
});
export type UploadDataRequest = {
  schema: UuidDto;
  data: Record<string, unknown>[];
};
export type UploadDataResponse = ApiResponse<InsertResult>;

export const uploadDataController: RequestHandler<
  EmptyObject,
  UploadDataResponse,
  UploadDataRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => UploadDataRequest.parse(req.body),
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
        E.bind("schema", () => SchemasRepository.find(new UUID(body.schema))),
        E.bind("data", ({ schema }) => {
          const ajv = new Ajv({ strict: "log" });
          addFormats(ajv);

          const validator = ajv.compile(schema.schema);
          const valid = validator(body.data);

          return valid
            ? E.succeed(body.data)
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
