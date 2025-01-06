import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonArray } from "type-fest";
import { z } from "zod";
import { ControllerError } from "#/common/error";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { Uuid, type UuidDto } from "#/common/types";
import { DataService } from "#/data/service";
import { isRoleAllowed } from "#/middleware/auth";
import type { CreatedResult, UpdateResult } from "./repository";

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

const createData: RequestHandler<
  EmptyObject,
  CreateDataResponse,
  CreateDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
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

    E.flatMap((body) => {
      return DataService.createRecords(
        req.ctx,
        req.account._id,
        body.schema,
        body.data,
      );
    }),

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

const updateData: RequestHandler<
  EmptyObject,
  UpdateDataResponse,
  UpdateDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => UpdateDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => {
      return DataService.updateRecords(req.ctx, body);
    }),
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

const readData: RequestHandler<
  EmptyObject,
  ReadDataResponse,
  ReadDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => ReadDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => DataService.readRecords(req.ctx, body)),
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

const deleteData: RequestHandler<
  EmptyObject,
  DeleteDataResponse,
  DeleteDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
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
          new ControllerError({
            message:
              "Filter cannot be empty. Use /data/flush to remove all records from a collection.",
          }),
        );

      return E.succeed(request);
    }),
    E.flatMap((request) => DataService.deleteRecords(req.ctx, request)),
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

const flushData: RequestHandler<
  EmptyObject,
  FlushDataResponse,
  FlushDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => FlushDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((request) =>
      DataService.flushCollection(req.ctx, request.schema),
    ),
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

const tailData: RequestHandler<
  EmptyObject,
  TailDataResponse,
  TailDataRequest
> = async (req, res) => {
  if (!isRoleAllowed(req, ["organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response = await pipe(
    E.try({
      try: () => TailDataRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((body) => DataService.tailData(req.ctx, body.schema)),
    E.map((data) => data as JsonArray),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const DataController = {
  createData,
  deleteData,
  flushData,
  readData,
  tailData,
  updateData,
};
