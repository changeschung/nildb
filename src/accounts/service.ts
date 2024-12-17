import { Effect as E, pipe } from "effect";
import type { RegisterAccountRequest } from "#/accounts/controllers";
import { ServiceError } from "#/common/error";
import { Identity } from "#/common/identity";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";
import {
  type AccountDocument,
  accountsFind,
  accountsFindOne,
  accountsInsert,
  toAdminAccountDocument,
  toOrganizationAccountDocument,
} from "./repository";

export function findAccountByDid(
  ctx: Context,
  did: NilDid,
): E.Effect<AccountDocument, ServiceError> {
  return pipe(
    accountsFindOne(ctx, { _id: did }),
    E.mapError(
      (error) =>
        new ServiceError({
          message: "Failed to find account by DID",
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

export function listAccounts(
  ctx: Context,
): E.Effect<AccountDocument[], ServiceError> {
  return pipe(
    accountsFind(ctx, {}),
    E.mapError(
      (error) =>
        new ServiceError({ message: "Failed to list accounts", cause: error }),
    ),
  );
}

export function registerAccount(
  ctx: Context,
  data: RegisterAccountRequest,
): E.Effect<NilDid, ServiceError> {
  return pipe(
    E.succeed(data),
    E.flatMap((data) => {
      if (data.did === ctx.node.identity.did) {
        return E.fail(
          new ServiceError({
            message: "DID prohibited",
            context: { data },
          }),
        );
      }

      if (!Identity.isDidFromPublicKey(data.did, data.publicKey)) {
        return E.fail(
          new ServiceError({
            message: "DID not derived from provided public key",
            context: { data },
          }),
        );
      }

      return E.succeed(data);
    }),
    E.flatMap((data) => {
      if (data.type === "admin") {
        const document = toAdminAccountDocument(data);
        return accountsInsert(ctx, document);
      }

      if (data.type === "organization") {
        const document = toOrganizationAccountDocument(data);
        return accountsInsert(ctx, document);
      }

      return E.fail(
        new ServiceError({
          message: "Cannot register root account",
          context: { data },
        }),
      );
    }),
    E.mapError((cause) => {
      return new ServiceError({
        message: "Account registration failure",
        cause,
      });
    }),
  );
}
