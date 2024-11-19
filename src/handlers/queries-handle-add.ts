import Ajv, { ValidationError } from "ajv";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { type Handler, foldToApiResponse } from "#/handlers/handler";
import { OrganizationsRepository, QueriesRepository } from "#/models";
import pipelineSchema from "#/models/mongodb_pipeline.json";
import type { QueryBase } from "#/models/queries";
import { Uuid, type UuidDto } from "#/types";

export const AddQueryRequestBody = z.object({
  org: Uuid,
  name: z.string(),
  schema: Uuid,
  variables: z.record(z.string(), z.unknown()),
  pipeline: z.array(z.record(z.string(), z.unknown())),
});
export type AddQueryRequestBody = {
  org: UuidDto;
  name: string;
  schema: UuidDto;
  variables: Record<string, unknown>;
  pipeline: Record<string, unknown>[];
};

export type AddQueryHandler = Handler<{
  path: "/api/v1/queries";
  request: AddQueryRequestBody;
  response: UuidDto;
}>;

export function queriesHandleAdd(
  app: Hono<AppEnv>,
  path: AddQueryHandler["path"],
): void {
  app.post(path, async (c) => {
    const response: AddQueryHandler["response"] = await pipe(
      E.tryPromise(() => c.req.json<unknown>()),

      E.flatMap((data) => {
        const result = AddQueryRequestBody.safeParse(data);
        return result.success ? E.succeed(result.data) : E.fail(result.error);
      }),

      E.flatMap((request) => {
        const ajv = new Ajv({ strict: "log" });
        const validator = ajv.compile(pipelineSchema);
        const valid = validator(request.pipeline);

        return valid
          ? E.succeed(request)
          : E.fail(new ValidationError(validator.errors ?? []));
      }),

      E.flatMap((request) =>
        pipe(
          QueriesRepository.create(request as Omit<QueryBase, "_id">),
          E.tap((queryId) => {
            return OrganizationsRepository.addQueryId(request.org, queryId);
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
