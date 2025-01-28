import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import * as QueriesService from "#/queries/queries.services";
import {
  type DeleteQueryRequest,
  DeleteQueryRequestSchema,
} from "#/queries/queries.types";
import {
  type ExecuteQueryRequest,
  ExecuteQueryRequestSchema,
} from "#/queries/queries.types";
import {
  type AdminAddQueryRequest,
  AdminAddQueryRequestSchema,
} from "./admin.types";

export const addQuery: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  AdminAddQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<AdminAddQueryRequest>(() =>
      AdminAddQueryRequestSchema.parse(body),
    ),
    E.flatMap((payload) => QueriesService.addQuery(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const deleteQuery: RequestHandler<
  EmptyObject,
  ApiResponse<boolean>,
  DeleteQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<DeleteQueryRequest>(() =>
      DeleteQueryRequestSchema.parse(body),
    ),
    E.flatMap((payload) => {
      return QueriesService.removeQuery(ctx, payload.id);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const executeQuery: RequestHandler<
  EmptyObject,
  ApiResponse<JsonValue>,
  ExecuteQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<ExecuteQueryRequest>(() =>
      ExecuteQueryRequestSchema.parse(body),
    ),
    E.flatMap((payload) => {
      return QueriesService.executeQuery(ctx, payload);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
