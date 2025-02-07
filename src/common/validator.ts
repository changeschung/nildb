import Ajv from "ajv";
import * as addFormats from "ajv-formats";
import type { DataValidationCxt } from "ajv/dist/types";
import { Effect as E } from "effect";
import { type SafeParseReturnType, z } from "zod";
import { DataValidationError } from "#/common/errors";
import { Uuid } from "#/common/types";

export function validateSchema(
  schema: Record<string, unknown>,
): E.Effect<void, DataValidationError> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      ajv.compile(schema);
    },
    catch: (e) => {
      if (e instanceof DataValidationError) {
        return e;
      }

      const issues = [];
      if (e instanceof Error && e.message) {
        issues.push(e.message);
      }
      return new DataValidationError(issues, e);
    },
  });
}

export function validateData<T>(
  schema: Record<string, unknown>,
  data: unknown,
): E.Effect<T, DataValidationError> {
  // TODO this is inefficient the ajv instance should be created once ... move to ctx
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      const validator = ajv.compile<T>(schema);

      if (validator(data)) {
        return data as T;
      }

      const cause = validator.errors ?? [];
      const issues = cause.map(
        (c) => `${c.instancePath}: ${c.message ?? "Unknown error"}`,
      );

      throw new DataValidationError(issues, cause);
    },
    catch: (e) => {
      if (e instanceof DataValidationError) {
        return e;
      }

      const issues = [];
      if (e instanceof Error && e.message) {
        issues.push(e.message);
      }
      return new DataValidationError(issues, e);
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
        throw new DataValidationError(
          ["coerce keyword requires format to be specified"],
          format,
        );
      }

      const coercer = coercers[format];
      if (!coercer) {
        throw new DataValidationError(
          [`Unsupported format for coercion: ${format}`],
          coercers,
        );
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
