import Ajv from "ajv";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { OrganizationsRepository, SchemasRepository } from "#/models";
import { DataRepository } from "#/models/data";
import type { SchemaBase } from "#/models/schemas";
import { Uuid, type UuidDto } from "#/types";
import { type Handler, foldToApiResponse } from "./handler";
import addFormats from "ajv-formats";

export const AddSchemaRequest = z.object({
  org: Uuid,
  name: z.string().min(1),
  keys: z.array(z.string().min(1)),
  schema: z.record(z.string(), z.unknown()),
});

export type AddSchemaRequest = {
  org: UuidDto;
  name: string;
  keys: string[];
  schema: Record<string, unknown>;
};

export type AddSchemaHandler = Handler<{
  path: "/api/v1/schemas";
  request: AddSchemaRequest;
  response: UuidDto;
}>;

export function schemasHandleAdd(
  app: Hono<AppEnv>,
  path: AddSchemaHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: AddSchemaHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = AddSchemaRequest.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) => {
        try {
          const ajv = new Ajv({ strict: false });
          addFormats(ajv)
          // Compile throws on invalid schemas
          ajv.compile(request.schema);
          return E.succeed(request);
        } catch (error) {
          return E.fail(new Error("Invalid query schema", { cause: error }));
        }
      }),

      E.flatMap((request) =>
        pipe(
          SchemasRepository.create(request as Omit<SchemaBase, "_id">),
          E.tap((schemaId) => {
            return DataRepository.createCollection(
              c.var.db.data,
              schemaId,
              request.keys,
            );
          }),
          E.tap((schemaId) => {
            return OrganizationsRepository.addSchemaId(request.org, schemaId);
          }),
        ),
      ),

      E.map((id) => id.toString() as UuidDto),

      foldToApiResponse(c),
      E.runPromise,
    );

    return c.json(response);
  });
}
