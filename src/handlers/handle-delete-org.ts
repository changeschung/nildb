import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { deleteOrgRecord } from "#/models/orgs";
import { findRootError } from "#/utils";

export const DeleteOrgReqBody = z.object({
  orgId: z.string(),
});
export type DeleteOrgReqBody = z.infer<typeof DeleteOrgReqBody>;

export type DeleteOrgPath = "/api/v1/orgs";

export function handleDeleteOrg(app: Hono<AppEnv>, path: DeleteOrgPath): void {
  app.delete(path, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return DeleteOrgReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ reqBody }) => deleteOrgRecord(reqBody.orgId)),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "delete org", c.var.log);
          return c.text("", status);
        },
        onSuccess: (data) => {
          c.var.log.info(`Deleted org: ${data.id}`);
          return c.text("", 200);
        },
      }),
      E.runPromise,
    );
  });
}
