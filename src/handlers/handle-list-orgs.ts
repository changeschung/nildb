import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import type { AppEnv } from "#/app";
import { listOrgRecords } from "#/models/orgs";
import { findRootError } from "#/utils";

export type ListOrgsPath = "/api/v1/orgs";

export function handleListOrgs(app: Hono<AppEnv>, path: ListOrgsPath): void {
  app.get(path, (c) => {
    return pipe(
      listOrgRecords(),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "list orgs", c.var.log);
          return c.text("", status);
        },
        onSuccess: (data) => c.json({ data }),
      }),
      E.runPromise,
    );
  });
}
