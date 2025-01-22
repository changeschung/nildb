import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonArray } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { DocumentBase } from "#/common/mongo";
import { enforceSchemaOwnership } from "#/common/ownership";
import { Uuid, type UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import type { UpdateResult, UploadResult } from "./repository";
import * as DataService from "./service";

export const MAX_RECORDS_LENGTH = 10_000;

export const UploadDataRequest = z.object({
  schema: Uuid,
  data: z
    .array(z.record(z.string(), z.unknown()))
    .refine(
      (elements) =>
        elements.length > 0 && elements.length <= MAX_RECORDS_LENGTH,
      { message: `Length must be non zero and lte ${MAX_RECORDS_LENGTH}` },
    ),
});
export type UploadDataRequest = z.infer<typeof UploadDataRequest>;
export type PartialDataDocumentDto = UploadDataRequest["data"] & {
  _id: UuidDto;
};
export type UploadDataResponse = ApiResponse<UploadResult>;

export const uploadData: RequestHandler<
  EmptyObject,
  UploadDataResponse,
  UploadDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<UploadDataRequest>(() => UploadDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((payload) => {
      return DataService.createRecords(ctx, payload.schema, payload.data);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const UpdateDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
  update: z.record(z.string(), z.unknown()),
});
export type UpdateDataRequest = z.infer<typeof UpdateDataRequest>;
export type UpdateDataResponse = ApiResponse<UpdateResult>;

export const updateData: RequestHandler<
  EmptyObject,
  UpdateDataResponse,
  UpdateDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<UpdateDataRequest>(() => UpdateDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((body) => {
      return DataService.updateRecords(ctx, body);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const ReadDataRequest = z.object({
  schema: Uuid,
  filter: z.record(z.string(), z.unknown()),
});
export type ReadDataRequest = z.infer<typeof ReadDataRequest>;
export type ReadDataResponse = ApiResponse<DocumentBase[]>;

export const readData: RequestHandler<
  EmptyObject,
  ReadDataResponse,
  ReadDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<ReadDataRequest>(() => ReadDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((payload) => DataService.readRecords(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const DeleteDataRequest = z.object({
  schema: Uuid,
  filter: z
    .record(z.string(), z.unknown())
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "Filter cannot be empty",
    }),
});
export type DeleteDataRequest = z.infer<typeof DeleteDataRequest>;
export type DeleteDataResponse = ApiResponse<number>;

export const deleteData: RequestHandler<
  EmptyObject,
  DeleteDataResponse,
  DeleteDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<DeleteDataRequest>(() => DeleteDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((payload) => DataService.deleteRecords(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const FlushDataRequest = z.object({
  schema: Uuid,
});
export type FlushDataRequest = z.infer<typeof FlushDataRequest>;
export type FlushDataResponse = ApiResponse<number>;

export const flushData: RequestHandler<
  EmptyObject,
  FlushDataResponse,
  FlushDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<FlushDataRequest>(() => TailDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((payload) => DataService.flushCollection(ctx, payload.schema)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const TailDataRequest = z.object({
  schema: Uuid,
});
export type TailDataRequest = z.infer<typeof TailDataRequest>;
export type TailDataResponse = ApiResponse<JsonArray>;

export const tailData: RequestHandler<
  EmptyObject,
  TailDataResponse,
  TailDataRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<TailDataRequest>(() => TailDataRequest.parse(body)),
    E.flatMap((payload) =>
      enforceSchemaOwnership(account, payload.schema, payload),
    ),
    E.flatMap((payload) => DataService.tailData(ctx, payload.schema)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
