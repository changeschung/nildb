import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import type { UuidDto } from "#/common/types";
import { PUBLIC_KEY_LENGTH } from "#/env";
import { isAccountAllowedGuard } from "#/middleware/auth";
import type { AccountDocument } from "./repository";
import { AdminService } from "./services";

export const CreateAdminAccountRequest = z.object({
  did: NilDid,
  publicKey: z.string().length(PUBLIC_KEY_LENGTH),
  name: z.string(),
});
export type CreateAdminAccountRequest = z.infer<
  typeof CreateAdminAccountRequest
>;
export type CreateAdminAccountResponse = ApiResponse<UuidDto>;

const createAdminAccount: RequestHandler<
  EmptyObject,
  CreateAdminAccountResponse,
  CreateAdminAccountRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: CreateAdminAccountResponse = await pipe(
    E.try({
      try: () => CreateAdminAccountRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((data) => AdminService.createAdminAccount(req.ctx, data)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export type ListAccountsResponse = ApiResponse<AccountDocument[]>;

const listAccounts: RequestHandler<EmptyObject, ListAccountsResponse> = async (
  req,
  res,
) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: ListAccountsResponse = await pipe(
    AdminService.listAllAccounts(req.ctx),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export type RemoveAccountRequestParams = { accountDid: NilDid };
export type RemoveAccountResponse = ApiResponse<NilDid>;

const removeAccount: RequestHandler<
  RemoveAccountRequestParams,
  RemoveAccountResponse
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: RemoveAccountResponse = await pipe(
    E.try({
      try: () => NilDid.parse(req.params.accountDid),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((id) => {
      return AdminService.removeAccount(req.ctx, id);
    }),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const AdminController = {
  createAdminAccount,
  listAccounts,
  removeAccount,
};
