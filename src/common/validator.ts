import Ajv from "ajv";
import * as addFormats from "ajv-formats";
import type { DataValidationCxt } from "ajv/dist/types";
import { Effect as E } from "effect";
import { type SafeParseReturnType, z } from "zod";
import { DataValidationError, ServiceError } from "#/common/app-error";
import { Uuid } from "#/common/types";

export function validateSchema(
  schema: Record<string, unknown>,
): E.Effect<boolean, ServiceError> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      registerFormats(ajv);
      registerCoercions(ajv);
      ajv.compile(schema);
      return true;
    },
    catch: (cause) => {
      const reason = ["Schema compilation failed"];
      if (cause instanceof Error && cause.message) {
        reason.push(cause.message);
      }
      return new ServiceError({
        reason,
        cause,
      });
    },
  });
}

export function validateData<T>(
  schema: Record<string, unknown>,
  data: unknown,
): E.Effect<T, DataValidationError> {
  // TODO this is inefficient the ajv instance should be created once ... move to ctx
  const ajv = new Ajv();
  registerFormats(ajv);
  registerCoercions(ajv);
  const validator = ajv.compile<T>(schema);

  if (validator(data)) {
    return E.succeed(data as T);
  }

  const cause = validator.errors ?? [];

  const reason = [
    "Schema validation failed",
    ...cause.map(
      (issue) => `${issue.instancePath}: ${issue.message ?? "Unknown error"}`,
    ),
  ];
  const error = new DataValidationError({
    reason,
    cause,
  });
  return E.fail(error);
}

function registerFormats(ajv: Ajv): void {
  addFormats.default(ajv);

  ajv.addFormat("numeric", {
    type: "string",
    validate: (str: string) => {
      const num = Number(str);
      return !Number.isNaN(num) && Number.isFinite(num);
    },
  });
}

type SupportedCoercions = "date-time" | "uuid" | "numeric";

function registerCoercions(ajv: Ajv): void {
  const coercers: Record<
    SupportedCoercions,
    (data: string) => SafeParseReturnType<unknown, unknown>
  > = {
    "date-time": (data) =>
      z
        .preprocess((arg) => {
          if (arg === null || arg === undefined) return undefined;
          if (typeof arg !== "string") return undefined;
          return new Date(arg);
        }, z.date())
        .safeParse(data),
    uuid: (data) => Uuid.safeParse(data),
    numeric: (data) =>
      z
        .preprocess((arg) => {
          if (arg === null || arg === undefined) return undefined;
          return Number(arg);
        }, z.number())
        .safeParse(data),
  };

  ajv.addKeyword({
    keyword: "coerce",
    type: "string",
    modifying: true,
    compile: (_value: boolean, parent: Record<string, unknown>) => {
      const format = parent.format as SupportedCoercions;

      if (!format) {
        throw new ServiceError({
          reason: ["coerce keyword requires format to be specified"],
          cause: format,
        });
      }

      const coercer = coercers[format];
      if (!coercer) {
        throw new ServiceError({
          reason: [`Unsupported format for coercion: ${format}`],
          cause: coercers,
        });
      }

      return (data: unknown, dataCtx?: DataValidationCxt): boolean => {
        if (typeof data !== "string") {
          return false;
        }

        const result = coercer(data);

        if (result.success && dataCtx?.parentData[dataCtx.parentDataProperty]) {
          dataCtx.parentData[dataCtx.parentDataProperty] = result.data;
          return true;
        }
        return false;
      };
    },
  });
}
