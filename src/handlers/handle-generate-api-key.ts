import { Effect as E } from "effect";
import type { Hono } from "hono";
import { sign } from "hono/jwt";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { findOrgById } from "#/models/orgs";
import { findRootError } from "#/utils";

export const GenerateOrgApiKeyReqBody = z.object({
  orgId: z.string(),
});
export type GenerateOrgApiKeyReqBody = z.infer<typeof GenerateOrgApiKeyReqBody>;

export type GenerateOrgApiKeyPath = "/api/v1/orgs/keys/generate";

export function handleGenerateApiKey(
  app: Hono<AppEnv>,
  path: GenerateOrgApiKeyPath,
): void {
  app.post(path, (c) => {
    return E.Do.pipe(
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return GenerateOrgApiKeyReqBody.parse(raw);
        }),
      ),
      E.flatMap(({ reqBody }) => findOrgById(reqBody.orgId)),
      E.flatMap((record) =>
        E.tryPromise(() =>
          sign(
            {
              sub: record.id,
              // In tests verification fails because iat === now(), so subtract 1s
              iat: Math.round(Date.now() / 1000) - 1,
              type: "api-key",
            },
            c.env.jwtSecret,
          ),
        ),
      ),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "generate api key", c.var.log);
          return c.text("", status);
        },
        onSuccess: (token) => c.json({ token }),
      }),
      E.runPromise,
    );
  });
}
