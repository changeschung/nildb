import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject, JsonValue } from "type-fest";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { enforceQueryOwnership } from "#/common/ownership";
import type { UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import * as QueriesService from "./queries.services";
import {
  type AddQueryRequest,
  AddQueryRequestSchema,
  type DeleteQueryRequest,
  DeleteQueryRequestSchema,
  type ExecuteQueryRequest,
  ExecuteQueryRequestSchema,
  type QueryDocument,
} from "./queries.types";

export const listQueries: RequestHandler<
  EmptyObject,
  ApiResponse<QueryDocument[]>,
  EmptyObject
> = async (req, res) => {
  const { ctx } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    QueriesService.findQueries(ctx, account._id),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const addQuery: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  AddQueryRequest
> = async (req, res) => {
  const { ctx, body } = req;
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<AddQueryRequest>(() => AddQueryRequestSchema.parse(body)),
    E.flatMap((payload) =>
      QueriesService.addQuery(ctx, {
        ...payload,
        owner: account._id,
      }),
    ),
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
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<DeleteQueryRequest>(() =>
      DeleteQueryRequestSchema.parse(body),
    ),
    E.flatMap((payload) => enforceQueryOwnership(account, payload.id, payload)),
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
  const account = req.account as OrganizationAccountDocument;

  await pipe(
    parseUserData<ExecuteQueryRequest>(() =>
      ExecuteQueryRequestSchema.parse(body),
    ),
    E.flatMap((payload) => enforceQueryOwnership(account, payload.id, payload)),
    E.flatMap((payload) => {
      return QueriesService.executeQuery(ctx, payload);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
