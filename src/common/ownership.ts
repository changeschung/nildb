import { Effect as E } from "effect";
import type { UUID } from "mongodb";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { ControllerError } from "#/common/app-error";

export function enforceQueryOwnership<T>(
  account: OrganizationAccountDocument,
  query: UUID,
  value: T, // pass through on success
): E.Effect<T, ControllerError, never> {
  const isAuthorized = account.queries.some(
    (s) => s.toString() === query.toString(),
  );

  return isAuthorized
    ? E.succeed(value)
    : E.fail(
        new ControllerError({
          reason: ["Query not found", account._id, query.toString()],
        }),
      );
}

export function enforceSchemaOwnership<T>(
  account: OrganizationAccountDocument,
  schema: UUID,
  value: T, // pass through on success
): E.Effect<T, ControllerError, never> {
  const isAuthorized = account.schemas.some(
    (s) => s.toString() === schema.toString(),
  );

  return isAuthorized
    ? E.succeed(value)
    : E.fail(
        new ControllerError({
          reason: ["Schema not found", account._id, schema.toString()],
        }),
      );
}
