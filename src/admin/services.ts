import { Effect as E, pipe } from "effect";
import {
  type AccountDocument,
  AdminAccountRepository,
} from "#/admin/repository";
import { ServiceError } from "#/common/app-error";
import { Identity } from "#/common/identity";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import type { CreateAdminAccountRequest } from "./controllers";

function createAdminAccount(
  ctx: Context,
  data: CreateAdminAccountRequest,
): E.Effect<NilDid, ServiceError> {
  return pipe(
    E.succeed(data),
    E.flatMap((data) => {
      if (data.did === ctx.node.identity.did) {
        return E.fail(
          new ServiceError({
            reason: "DID prohibited",
            context: { data },
          }),
        );
      }

      if (!Identity.isDidFromPublicKey(data.did, data.publicKey)) {
        return E.fail(
          new ServiceError({
            reason: "DID not derived from provided public key",
            context: { data },
          }),
        );
      }

      return E.succeed(data);
    }),
    E.flatMap((data) => {
      const document = AdminAccountRepository.toAdminAccountDocument(data);
      return AdminAccountRepository.insert(ctx, document);
    }),
    E.mapError((cause) => {
      return new ServiceError({
        reason: "Create admin account failure",
        cause,
      });
    }),
  );
}

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

export function removeAccount(
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

export const AdminService = {
  createAdminAccount,
  listAllAccounts,
  removeAccount,
};
