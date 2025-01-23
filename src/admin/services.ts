import { Effect as E, pipe } from "effect";
import { ServiceError } from "#/common/app-error";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import type { AccountDocument } from "./repository";
import * as AdminAccountRepository from "./repository";

export function listAllAccounts(
  ctx: Context,
): E.Effect<AccountDocument[], ServiceError> {
  return pipe(
    AdminAccountRepository.listAll(ctx),
    E.mapError((error) => {
      return new ServiceError({
        reason: "Failed to list accounts",
        cause: error,
      });
    }),
  );
}

export function deleteAccount(
  ctx: Context,
  id: NilDid,
): E.Effect<NilDid, ServiceError> {
  return pipe(
    AdminAccountRepository.deleteOneById(ctx, id),
    E.mapError((error) => {
      return new ServiceError({
        reason: "Failed to list accounts",
        cause: error,
      });
    }),
  );
}
