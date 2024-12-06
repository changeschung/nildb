import Ajv from "ajv";
import * as addFormats from "ajv-formats";
import type { DataValidationCxt } from "ajv/dist/types";
import { Effect as E } from "effect";
import { type SafeParseReturnType, z } from "zod";
import { Uuid } from "#/common/types";

export function validateSchema(
  schema: Record<string, unknown>,
): E.Effect<boolean, Error> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      ajv.compile(schema);
      return true;
    },
    catch: (cause) => {
      return new Error("Schema compilation failed", { cause });
    },
  });
}

export function validateData<T>(
  schema: Record<string, unknown>,
  data: unknown,
): E.Effect<T, Error> {
  return E.try({
    try: () => {
      const ajv = new Ajv();
      addFormats.default(ajv);
      registerCoercions(ajv);
      const validator = ajv.compile<T>(schema);
      validator(data);
      return data as T;
    },
    catch: (cause) => {
      return new Error("Schema compilation failed", { cause });
    },
  });
}

type SupportedCoercions = "date-time" | "uuid";

function registerCoercions(ajv: Ajv): void {
  const coercers: Record<
    SupportedCoercions,
    (data: string) => SafeParseReturnType<unknown, unknown>
  > = {
    "date-time": (data) => z.coerce.date().safeParse(data),
    uuid: (data) => Uuid.safeParse(data),
  };

  ajv.addKeyword({
    keyword: "coerce",
    type: "string",
    modifying: true,
    compile: (_value: boolean, parent: Record<string, unknown>) => {
      const format = parent.format as SupportedCoercions;

      if (!format) {
        throw new Error("coerce keyword requires format to be specified");
      }

      const coercer = coercers[format];
      if (!coercer) {
        throw new Error(`Unsupported format for coercion: ${format}`);
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
