import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { AccountService } from "#/accounts/service";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { NilDid } from "#/common/nil-did";
import { PUBLIC_KEY_LENGTH } from "#/env";
import { isAccountAllowedGuard } from "#/middleware/auth";

export type GetAccountRequest = EmptyObject;
export type GetAccountResponse = ApiResponse<OrganizationAccountDocument>;

const get: RequestHandler<
  EmptyObject,
  GetAccountResponse,
  GetAccountRequest
> = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["admin", "organization"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: GetAccountResponse = await pipe(
    AccountService.find(req.ctx, req.account._id),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const RegisterAccountRequest = z.object({
  did: NilDid,
  publicKey: z.string().length(PUBLIC_KEY_LENGTH),
  name: z.string(),
});
export type RegisterAccountRequest = z.infer<typeof RegisterAccountRequest>;
export type RegisterAccountResponse = ApiResponse<NilDid>;

const register: RequestHandler<
  EmptyObject,
  RegisterAccountResponse,
  RegisterAccountRequest
> = async (req, res) => {
  const response: RegisterAccountResponse = await pipe(
    E.try({
      try: () => RegisterAccountRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((data) => AccountService.register(req.ctx, data)),
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

const remove: RequestHandler = async (req, res) => {
  if (!isAccountAllowedGuard(req.ctx, ["root", "admin"], req.account)) {
    res.sendStatus(401);
    return;
  }

  const response: RemoveAccountResponse = await pipe(
    E.try({
      try: () => RemoveAccountRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap(({ id }) => AccountService.remove(req.ctx, id)),
    foldToApiResponse(req.ctx),
    E.runPromise,
  );

  res.send(response);
};

export const AccountController = {
  get,
  register,
  remove,
};
