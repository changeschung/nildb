import { Effect as E, pipe } from "effect";
import * as AdminAccountRepository from "#/admin/admin.repository";
import type { AdminCreateAccountRequest } from "#/admin/admin.types";
import { ServiceError } from "#/common/app-error";
import { Identity } from "#/common/identity";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import * as AccountRepository from "./accounts.repository";
import type {
  OrganizationAccountDocument,
  RegisterAccountRequest,
} from "./accounts.types";

export function find(
  ctx: Context,
  did: NilDid,
): E.Effect<OrganizationAccountDocument, ServiceError> {
  return pipe(
    AccountRepository.findOne(ctx, { _id: did }),
    E.mapError(
      (error) =>
        new ServiceError({
          reason: "Failed to find account by DID",
          cause: error,
          context: {
            did,
          },
        }),
    ),
    E.tap((account) => {
      ctx.log.debug(`Found ${account._type} account: ${account._id}`);
    }),
  );
}

export function createAccount(
  ctx: Context,
  data: RegisterAccountRequest | AdminCreateAccountRequest,
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
            reason: "DID not derived from public key",
            context: { data },
          }),
        );
      }

      return E.succeed(data);
    }),
    E.flatMap((data) => {
      const isAdminRegistration =
        "type" in data && data.type.toLocaleLowerCase() === "admin";

      if (isAdminRegistration) {
        const document = AdminAccountRepository.toAdminAccountDocument(data);
        return AdminAccountRepository.insert(ctx, document);
      }

      const document = AccountRepository.toOrganizationAccountDocument(
        data,
        ctx.config.env,
      );
      return AccountRepository.insert(ctx, document);
    }),
    E.mapError((cause) => {
      return new ServiceError({
        reason: "Register organization failure",
        cause,
      });
    }),
  );
}

export function remove(
  ctx: Context,
  id: NilDid,
): E.Effect<NilDid, ServiceError> {
  return pipe(
    AccountRepository.deleteOneById(ctx, id),
    E.mapError(
      (error) =>
        new ServiceError({
          reason: `Failed to delete account: ${id}`,
          cause: error,
        }),
    ),
    E.tap((id) => {
      ctx.log.debug(`Removed organization account: ${id}`);
    }),
  );
}

export function setSubscriptionState(
  ctx: Context,
  ids: NilDid[],
  active: boolean,
): E.Effect<NilDid[], ServiceError> {
  return pipe(
    AccountRepository.setSubscriptionState(ctx, ids, active),
    E.mapError(
      (error) =>
        new ServiceError({
          reason: "Failed to set accounts subscription state",
          cause: error,
        }),
    ),
    E.tap((ids) => {
      ctx.log.debug(`Set subscription.active=${active} for accounts: %O`, ids);
    }),
  );
}
