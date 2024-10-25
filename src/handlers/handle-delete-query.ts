import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { removeOrgQueryRecord } from "#/models/queries";
import { findRootError } from "#/utils";

export const DeleteQueryReqBody = z.object({
  queryName: z.string(),
});
export type DeleteQueryReqBody = z.infer<typeof DeleteQueryReqBody>;

export type DeleteQueryPath = "/api/v1/orgs/queries";

export function handleDeleteQuery(
  app: Hono<AppEnv>,
  path: DeleteQueryPath,
): void {
  app.delete(path, (c) => {
    return E.Do.pipe(
      E.let("orgId", () => c.get("jwtPayload").sub),
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return DeleteQueryReqBody.parse(raw);
        }),
      ),
      E.bind("org", ({ orgId, reqBody }) =>
        removeOrgQueryRecord(orgId, reqBody.queryName),
      ),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "delete query", c.var.log);
          return c.text("", status);
        },
        onSuccess: ({ orgId, reqBody }) => {
          c.var.log.info(`Deleted ${orgId}/queries/${reqBody.queryName}`);
          return c.text("", 200);
        },
      }),
      E.runPromise,
    );
  });
}
