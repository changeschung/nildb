import Ajv from "ajv";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { UUID } from "mongodb";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { DataRepository } from "#/models/data";
import { SchemasRepository } from "#/models/schemas";
import { Uuid, type UuidDto } from "#/types";
import addFormats from "ajv-formats";

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
  // TODO: break down to updated / inserted ... could also return uuids?
  response: number;
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

      E.flatMap((request) =>
        pipe(
          E.Do,
          E.bind("document", () =>
            SchemasRepository.find(new UUID(request.schema)),
          ),
          E.bind("data", ({ document }) => {
            const ajv = new Ajv({ strict: "log" });
            addFormats(ajv)

            const validator = ajv.compile(document.schema);
            const valid = validator(request.data);

            return valid
              ? E.succeed(request.data)
              : E.fail(
                  new Error("Upload data failed schema validation", {
                    cause: validator.errors,
                  }),
                );
          }),
          E.flatMap(({ document, data }) => {
            return DataRepository.insert(
              {
                client: c.var.db.data,
                schema: document,
              },
              data,
            );
          }),
        ),
      ),
      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response, 200);
  });
}
