import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import type { EmptyObject } from "type-fest";
import { foldToApiResponse } from "#/common/handler";
import { parseUserData } from "#/common/zod-utils";
import { isRoleAllowed } from "#/middleware/auth.middleware";
import * as AccountService from "./accounts.services";
import {
  type GetAccountResponse,
  type RegisterAccountRequest,
  RegisterAccountRequestSchema,
  type RegisterAccountResponse,
  type RemoveAccountRequest,
  RemoveAccountRequestSchema,
  type RemoveAccountResponse,
} from "./accounts.types";

export const get: RequestHandler<
  EmptyObject,
  GetAccountResponse,
  EmptyObject
> = async (req, res) => {
  const { ctx, account } = req;

  if (!isRoleAllowed(req, ["admin", "organization"])) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  await pipe(
    AccountService.find(ctx, account._id),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const register: RequestHandler<
  EmptyObject,
  RegisterAccountResponse,
  RegisterAccountRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (req.account?._type) {
    res.status(400).json({
      ts: new Date(),
      errors: ["Use /admin/* endpoints for account management"],
    });
    return;
  }

  await pipe(
    parseUserData<RegisterAccountRequest>(() =>
      RegisterAccountRequestSchema.parse(body),
    ),
    E.flatMap((payload) => AccountService.createAccount(ctx, payload)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};

export const remove: RequestHandler<
  EmptyObject,
  RemoveAccountResponse,
  RemoveAccountRequest
> = async (req, res) => {
  const { ctx, body } = req;

  if (!isRoleAllowed(req, ["root", "admin"])) {
    res.sendStatus(StatusCodes.UNAUTHORIZED);
    return;
  }

  await pipe(
    parseUserData<RemoveAccountRequest>(() =>
      RemoveAccountRequestSchema.parse(body),
    ),
    E.flatMap((payload) => AccountService.remove(ctx, payload.id)),
    foldToApiResponse(req, res),
    E.runPromise,
  );
};
