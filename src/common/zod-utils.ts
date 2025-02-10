import { zValidator } from "@hono/zod-validator";
import { StatusCodes } from "http-status-codes";
import { Temporal } from "temporal-polyfill";
import type { Schema, ZodError } from "zod";

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

export function payloadValidator<T extends Schema>(schema: T) {
  return zValidator("json", schema, (result, c) => {
    if (result.success) {
      return result.data;
    }

    const errors = flattenZodError(result.error);
    return c.json(
      { ts: Temporal.Now.instant().toString(), errors },
      StatusCodes.BAD_REQUEST,
    );
  });
}

export function paramsValidator<T extends Schema>(schema: T) {
  return zValidator("param", schema, (result, c) => {
    if (result.success) {
      return result.data;
    }

    const errors = flattenZodError(result.error);
    return c.json(
      { ts: Temporal.Now.instant().toString(), errors },
      StatusCodes.BAD_REQUEST,
    );
  });
}
