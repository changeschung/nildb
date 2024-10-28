import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { createOrgRecord } from "#/models/orgs";
import { findRootError } from "#/utils";

export const CreateOrgReqBody = z.object({
  name: z.string(),
  prefix: z.string().min(5),
});
export type CreateOrgReqBody = z.infer<typeof CreateOrgReqBody>;

export type CreateOrgPath = "/api/v1/orgs";

export function handleCreateOrg(app: Hono<AppEnv>, path: CreateOrgPath): void {
  app.post(path, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return CreateOrgReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ reqBody }) => createOrgRecord(reqBody)),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "create org", c.var.log);
          return c.text("", status);
        },
        onSuccess: (data) => {
          return c.json({ data });
        },
      }),
      E.runPromise,
    );
  });
}
