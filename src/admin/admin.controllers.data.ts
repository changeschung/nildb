import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonArray } from "type-fest";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { parseUserData } from "#/common/zod-utils";
import type { UpdateResult, UploadResult } from "#/data/data.repository";
import * as DataService from "#/data/data.services";
import {
  type DeleteDataRequest,
  DeleteDataRequestSchema,
  type FlushDataRequest,
  FlushDataRequestSchema,
  type ReadDataRequest,
  ReadDataRequestSchema,
  type TailDataRequest,
  TailDataRequestSchema,
  type UpdateDataRequest,
  UpdateDataRequestSchema,
  type UploadDataRequest,
  UploadDataRequestSchema,
} from "#/data/data.types";

export const deleteData: RequestHandler<
  EmptyObject,
  ApiResponse<number>,
  DeleteDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<DeleteDataRequest>(() => DeleteDataRequestSchema.parse(body)),
    E.flatMap((payload) => DataService.deleteRecords(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const flushData: RequestHandler<
  EmptyObject,
  ApiResponse<number>,
  FlushDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<FlushDataRequest>(() => FlushDataRequestSchema.parse(body)),
    E.flatMap((payload) => DataService.flushCollection(ctx, payload.schema)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const readData: RequestHandler<
  EmptyObject,
  ApiResponse<DocumentBase[]>,
  ReadDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<ReadDataRequest>(() => ReadDataRequestSchema.parse(body)),
    E.flatMap((payload) => DataService.readRecords(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const tailData: RequestHandler<
  EmptyObject,
  ApiResponse<JsonArray>,
  TailDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<TailDataRequest>(() => TailDataRequestSchema.parse(body)),
    E.flatMap((payload) => DataService.tailData(ctx, payload.schema)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const uploadData: RequestHandler<
  EmptyObject,
  ApiResponse<UploadResult>,
  UploadDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<UploadDataRequest>(() => UploadDataRequestSchema.parse(body)),
    E.flatMap((payload) => {
      return DataService.createRecords(ctx, payload.schema, payload.data);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const updateData: RequestHandler<
  EmptyObject,
  ApiResponse<UpdateResult>,
  UpdateDataRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<UpdateDataRequest>(() => UpdateDataRequestSchema.parse(body)),
    E.flatMap((body) => {
      return DataService.updateRecords(ctx, body);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
