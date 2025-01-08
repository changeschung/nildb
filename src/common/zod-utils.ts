import { Effect as E } from "effect";
import { ZodError } from "zod";
import { DataValidationError } from "#/common/app-error";

export function parseUserData<T>(
  fun: () => T,
): E.Effect<T, DataValidationError> {
  return E.try({
    try: fun,
    catch: (cause: unknown) => {
      const reason =
        cause instanceof ZodError ? flattenZodError(cause) : ["Unknown error"];

      return new DataValidationError({
        reason,
        cause,
      });
    },
  });
}

export function flattenZodError(error: ZodError): string[] {
  const reasons = [];
  const flattened = error.flatten();

  const fieldErrors = Object.entries(flattened.fieldErrors).flatMap(
    ([field, errors]) =>
      (errors ?? []).map((error) => `key=${field}, reason=${error}`),
  );
  reasons.push(...fieldErrors, ...flattened.formErrors);

  return reasons;
}
