import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import type { UuidDto } from "#/common/types";
import { parseUserData } from "#/common/zod-utils";
import { PUBLIC_KEY_LENGTH } from "#/env";
import { isRoleAllowed } from "#/middleware/auth";
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
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["root", "admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    parseUserData<CreateAdminAccountRequest>(() =>
      CreateAdminAccountRequest.parse(body),
    ),
    E.flatMap((payload) => AdminService.createAdminAccount(ctx, payload)),
    E.map((id) => id.toString() as UuidDto),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export type ListAccountsResponse = ApiResponse<AccountDocument[]>;

const listAccounts: RequestHandler<EmptyObject, ListAccountsResponse> = async (
  req,
  res,
) => {
  const { ctx } = req;

  if (!isRoleAllowed(req, ["root", "admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    AdminService.listAllAccounts(ctx),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export type RemoveAccountRequestParams = { accountDid: NilDid };
export type RemoveAccountResponse = ApiResponse<NilDid>;

const removeAccount: RequestHandler<
  RemoveAccountRequestParams,
  RemoveAccountResponse
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["root", "admin"])) {
    res.sendStatus(401);
    return;
  }

  await pipe(
    parseUserData<NilDid>(() => NilDid.parse(body)),
    E.flatMap((id) => {
      return AdminService.removeAccount(ctx, id);
    }),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const AdminController = {
  createAdminAccount,
  listAccounts,
  removeAccount,
};
