import { Effect as E, pipe } from "effect";
import type { ServiceError } from "#/common/error";
import type { Context } from "#/env";

export function registerSchema(_ctx: Context): E.Effect<null, ServiceError> {
  return pipe(E.succeed(null));
}
export function removeSchema(_ctx: Context): E.Effect<null, ServiceError> {
  return pipe(E.succeed(null));
}

export function registerQuery(_ctx: Context): E.Effect<null, ServiceError> {
  return pipe(E.succeed(null));
}
export function removeQuery(_ctx: Context): E.Effect<null, ServiceError> {
  return pipe(E.succeed(null));
}
