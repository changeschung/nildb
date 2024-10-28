import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import {
  removeOrgSchemaCollection,
  removeOrgSchemaRecord,
} from "#/models/schemas";
import { findRootError } from "#/utils";

export const DeleteSchemaReqBody = z.object({
  schemaName: z.string(),
});
export type DeleteSchemaReqBody = z.infer<typeof DeleteSchemaReqBody>;

export type DeleteSchemaPath = "/api/v1/orgs/schemas";

export function handleDeleteSchema(
  app: Hono<AppEnv>,
  path: DeleteSchemaPath,
): void {
  app.delete(path, (c) => {
    return E.Do.pipe(
      E.let("orgId", () => c.get("jwtPayload").sub),
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return DeleteSchemaReqBody.parse(raw);
        }),
      ),
      E.bind("org", ({ orgId, reqBody }) =>
        removeOrgSchemaRecord(orgId, reqBody.schemaName),
      ),
      E.flatMap(({ reqBody }) =>
        removeOrgSchemaCollection(c.var.db.mongo, reqBody.schemaName),
      ),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "delete schema", c.var.log);
          return c.text("", status);
        },
        onSuccess: (name) => {
          c.var.log.info(`Deleted schema collection ${name}`);
          return c.text("", 200);
        },
      }),
      E.runPromise,
    );
  });
}
