import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { listAccounts, registerAccount } from "#/accounts/service";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import type { UuidDto } from "#/common/types";
import { PUBLIC_KEY_LENGTH } from "#/env";
import { isAccountAllowedGuard } from "#/middleware/auth";
import { type AccountDocument, accountsDeleteOne } from "./repository";

export type ListAccountsResponse = ApiResponse<AccountDocument[]>;

export const listAccountsController: RequestHandler<
  EmptyObject,
  ListAccountsResponse
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: ListAccountsResponse = await pipe(
    listAccounts(req.ctx),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const RegisterAccountRequest = z.union([
  z.object({
    type: z.enum(["admin"]),
    did: NilDid,
    publicKey: z.string().length(PUBLIC_KEY_LENGTH),
    name: z.string(),
  }),
  z.object({
    type: z.enum(["organization"]),
    did: NilDid,
    publicKey: z.string().length(PUBLIC_KEY_LENGTH),
    name: z.string(),
  }),
]);
export type RegisterAccountRequest = z.infer<typeof RegisterAccountRequest>;
export type RegisterAccountResponse = ApiResponse<UuidDto>;

export const registerAccountController: RequestHandler<
  EmptyObject,
  RegisterAccountResponse,
  RegisterAccountRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: RegisterAccountResponse = await pipe(
    E.try({
      try: () => RegisterAccountRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((data) => registerAccount(req.ctx, data)),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.ctx),

    E.runPromise,
  );

  res.send(response);
};

export const RemoveAccountRequest = z.object({
  id: NilDid,
});
export type RemoveAccountRequest = z.infer<typeof RemoveAccountRequest>;
export type RemoveAccountResponse = ApiResponse<string>;

export const removeAccountController: RequestHandler = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: RemoveAccountResponse = await pipe(
    E.try({
      try: () => RemoveAccountRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap(({ id }) => accountsDeleteOne(req.ctx, { _id: id })),

    E.map((document) => document._id),

    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};
