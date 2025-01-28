import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import * as AccountService from "#/accounts/accounts.services";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import type { NilDid } from "#/common/nil-did";
import type { UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import * as AdminService from "./admin.services";
import type { AccountDocument } from "./admin.types";
import {
  type AdminCreateAccountRequest,
  AdminCreateAccountRequestSchema,
  type AdminDeleteAccountRequest,
  AdminDeleteAccountRequestSchema,
  type AdminSetSubscriptionStateRequest,
  AdminSetSubscriptionStateRequestSchema,
} from "./admin.types";

export const createAccount: RequestHandler<
  EmptyObject,
  ApiResponse<UuidDto>,
  AdminCreateAccountRequest
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<AdminCreateAccountRequest>(() =>
      AdminCreateAccountRequestSchema.parse(body),
    ),
    E.flatMap((payload) => AccountService.createAccount(ctx, payload)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const listAccounts: RequestHandler<
  EmptyObject,
  ApiResponse<AccountDocument[]>
> = async (req, res) => {
  const { ctx } = req;

  await pipe(
    AdminService.listAllAccounts(ctx),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const deleteAccount: RequestHandler<
  EmptyObject,
  AdminDeleteAccountRequest,
  ApiResponse<NilDid>
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<AdminDeleteAccountRequest>(() =>
      AdminDeleteAccountRequestSchema.parse(body),
    ),
    E.flatMap((payload) => {
      return AdminService.deleteAccount(ctx, payload.id);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const setSubscriptionState: RequestHandler<
  EmptyObject,
  AdminSetSubscriptionStateRequest,
  ApiResponse<NilDid>
> = async (req, res) => {
  const { ctx, body } = req;

  await pipe(
    parseUserData<AdminSetSubscriptionStateRequest>(() =>
      AdminSetSubscriptionStateRequestSchema.parse(body),
    ),
    E.flatMap((payload) =>
      AccountService.setSubscriptionState(ctx, payload.ids, payload.active),
    ),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
