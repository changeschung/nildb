import Ajv, { ValidationError } from "ajv";
import addFormats from "ajv-formats";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { UUID } from "mongodb";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { DataRepository, type InsertResult } from "#/models/data";
import { SchemasRepository } from "#/models/schemas";
import { Uuid, type UuidDto } from "#/types";

export const MAX_RECORDS_LENGTH = 10_000;

export const UploadDataRequestBody = z.object({
  schema: Uuid,
  data: z.array(z.record(z.unknown())),
});
export type UploadDataRequestBody = {
  schema: UuidDto;
  data: Record<string, unknown>[];
};

export type UploadDataHandler = Handler<{
  path: "/api/v1/data";
  request: UploadDataRequestBody;
  response: InsertResult;
}>;

export function dataHandleUpload(
  app: Hono<AppEnv>,
  path: UploadDataHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: UploadDataHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = UploadDataRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) => {
        return request.data.length <= MAX_RECORDS_LENGTH
          ? E.succeed(request)
          : E.fail(
              new Error(`Max data length is ${MAX_RECORDS_LENGTH} elements`),
            );
      }),

      E.flatMap((request) =>
        pipe(
          E.Do,
          E.bind("schema", () =>
            SchemasRepository.find(new UUID(request.schema)),
          ),
          E.bind("data", ({ schema }) => {
            const ajv = new Ajv({ strict: "log" });
            addFormats(ajv);

            const validator = ajv.compile(schema.schema);
            const valid = validator(request.data);

            return valid
              ? E.succeed(request.data)
              : E.fail(new ValidationError(validator.errors ?? []));
          }),
          E.flatMap(({ schema, data }) => {
            return DataRepository.insert(c.var.db.data, schema, data);
          }),
        ),
      ),
      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
