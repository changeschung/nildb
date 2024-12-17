import Ajv from "ajv";
import * as addFormats from "ajv-formats";
import type { DataValidationCxt } from "ajv/dist/types";
import { Effect as E } from "effect";
import { type SafeParseReturnType, z } from "zod";
import { ServiceError } from "#/common/error";
import { Uuid } from "#/common/types";

export function validateSchema(
  schema: Record<string, unknown>,
): E.Effect<boolean, ServiceError> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      ajv.compile(schema);
      return true;
    },
    catch: (cause) => {
      return new ServiceError({ message: "Schema compilation failed", cause });
    },
  });
}

export function validateData<T>(
  schema: Record<string, unknown>,
  data: unknown,
): E.Effect<T, ServiceError> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      const validator = ajv.compile<T>(schema);
      if (!validator(data)) {
        throw validator.errors;
      }

      return data as T;
    },
    catch: (cause) => {
      return new ServiceError({
        message: "Data failed schema validation",
        cause,
      });
    },
  });
}

type SupportedCoercions = "date-time" | "uuid";

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
  };

  ajv.addKeyword({
    keyword: "coerce",
    type: "string",
    modifying: true,
    compile: (_value: boolean, parent: Record<string, unknown>) => {
      const format = parent.format as SupportedCoercions;

      if (!format) {
        throw new ServiceError({
          message: "coerce keyword requires format to be specified",
          cause: format,
        });
      }

      const coercer = coercers[format];
      if (!coercer) {
        throw new ServiceError({
          message: `Unsupported format for coercion: ${format}`,
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
