import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonArray } from "type-fest";
import { z } from "zod";
import { ControllerError } from "#/common/error";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { Uuid, type UuidDto } from "#/common/types";
import { validateData } from "#/common/validator";
import { readData } from "#/data/service";
import { isAccountAllowedGuard } from "#/middleware/auth";
import { schemasFindOne } from "#/schemas/repository";
import {
  type CreatedResult,
  type UpdateResult,
  dataDeleteMany,
  dataFlushCollection,
  dataInsert,
  dataTailCollection,
  dataUpdateMany,
} from "./repository";

export const MAX_RECORDS_LENGTH = 10_000;

export const CreateDataRequest = z.object({
  schema: Uuid,
  data: z.array(z.record(z.string(), z.unknown())),
});
export type CreateDataRequest = z.infer<typeof CreateDataRequest>;
export type PartialDataDocumentDto = CreateDataRequest["data"] & {
  _id: UuidDto;
};
export type CreateDataResponse = ApiResponse<CreatedResult>;

export const createDataController: RequestHandler<
  EmptyObject,
  CreateDataResponse,
  CreateDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => CreateDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) => {
      return body.data.length <= MAX_RECORDS_LENGTH
        ? E.succeed(body)
        : E.fail(
            new ControllerError({
              message: `Max data length is ${MAX_RECORDS_LENGTH} elements`,
            }),
          );
    }),

    E.flatMap((body) =>
      pipe(
        E.Do,
        E.bind("document", () => {
          return schemasFindOne(req.ctx, {
            _id: body.schema,
            owner: req.account._id,
          });
        }),
        E.bind("data", ({ document }) => {
          return validateData<PartialDataDocumentDto[]>(
            document.schema,
            body.data,
          );
        }),
        E.flatMap(({ document, data }) => {
          return dataInsert(req.ctx, document, data);
        }),
      ),
    ),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const UpdateDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
  update: z.record(z.string(), z.unknown()),
});
export type UpdateDataRequest = z.infer<typeof UpdateDataRequest>;
export type UpdateDataResponse = ApiResponse<UpdateResult>;

export const updateDataController: RequestHandler<
  EmptyObject,
  UpdateDataResponse,
  UpdateDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => UpdateDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) =>
      dataUpdateMany(req.ctx, body.schema, body.filter, body.update),
    ),

    E.map((data) => data),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const ReadDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type ReadDataRequest = z.infer<typeof ReadDataRequest>;
export type ReadDataResponse = ApiResponse<DocumentBase[]>;

export const readDataController: RequestHandler<
  EmptyObject,
  ReadDataResponse,
  ReadDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => ReadDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((body) => readData(req.ctx, body)),

    E.map((data) => data),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type DeleteDataRequest = z.infer<typeof DeleteDataRequest>;
export type DeleteDataResponse = ApiResponse<number>;

export const deleteDataController: RequestHandler<
  EmptyObject,
  DeleteDataResponse,
  DeleteDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

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
      dataDeleteMany(req.ctx, request.schema, request.filter),
    ),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const FlushDataRequest = z.object({
  schema: Uuid,
});
export type FlushDataRequest = z.infer<typeof FlushDataRequest>;
export type FlushDataResponse = ApiResponse<number>;

export const flushDataController: RequestHandler<
  EmptyObject,
  FlushDataResponse,
  FlushDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => FlushDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) => dataFlushCollection(req.ctx, request.schema)),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const TailDataRequest = z.object({
  schema: Uuid,
});
export type TailDataRequest = z.infer<typeof TailDataRequest>;
export type TailDataResponse = ApiResponse<JsonArray>;

export const tailDataController: RequestHandler<
  EmptyObject,
  TailDataResponse,
  TailDataRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => TailDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => dataTailCollection(req.ctx, body.schema)),
    E.map((data) => data as JsonArray),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};
