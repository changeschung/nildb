import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { findOrgById } from "#/models/orgs";
import { findRootError } from "#/utils";

export const RunQueryReqBody = z.object({
  queryName: z.string().length(17),
});
export type RunQueryReqBody = z.infer<typeof RunQueryReqBody>;

export type RunQueryResBody<T = unknown> = {
  queryName: string;
  data: T;
};

export type RunQueryPath = "/api/v1/data/query";

export function handleRunQuery(app: Hono<AppEnv>, path: RunQueryPath): void {
  app.post(path, (c) => {
    return E.Do.pipe(
      E.let("orgId", () => c.get("jwtPayload").sub),
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return RunQueryReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ orgId, reqBody }) =>
        E.tryPromise(async () => {
          const org = await findOrgById(orgId).pipe(E.runPromise);
          const { queryName } = reqBody;
          const query = org.queries.get(queryName)!;
          const pipeline = JSON.parse(query.pipeline);

          const data = await c.var.db.mongo
            .db()
            .collection(query.schema)
            .aggregate(pipeline)
            .toArray();

          return {
            queryName,
            data,
          };
        }),
      ),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "run query", c.var.log);
          return c.text("", status);
        },
        onSuccess: (result: RunQueryResBody) => {
          c.var.log.info(`Query ${result.queryName} succeeded`);
          return c.json(result);
        },
      }),
      E.runPromise,
    );
  });
}
