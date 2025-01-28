import { Effect as E, pipe } from "effect";
import { ServiceError } from "#/common/app-error";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";
import * as AdminAccountRepository from "./admin.repository";
import type { AccountDocument } from "./admin.types";

export function listAllAccounts(
  ctx: AppBindings,
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
  ctx: AppBindings,
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
