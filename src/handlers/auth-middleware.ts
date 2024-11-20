import type { Hono } from "hono";
import { sign } from "hono/jwt";
import { jwt } from "hono/jwt";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { Uuid } from "#/types";

export const JwtPayload = z.object({
  sub: Uuid,
  iat: z.number().int(),
  type: z.enum(["root", "admin", "access-token"]),
});
export type JwtPayload = z.infer<typeof JwtPayload>;

export type SerializedJwt = string;

export function authMiddleware(app: Hono<AppEnv>, secret: string): void {
  app.use("*", jwt({ secret }), async (c, next) => {
    const data = c.get("jwtPayload");

    const result = JwtPayload.safeParse(data);

    if (!result.success) {
      c.var.Log.warn("JwtPayload parse failed: %O", result.error.flatten());
      return c.text("Unauthorized", 401);
    }

    // root uses the nil uuid, eg `00000000-0000-0000-0000-000000000000`
    c.set("subject", result.data.sub);

    await next();
  });
}

export function createJwt(
  partial: Partial<JwtPayload>,
  secretKey: string,
): Promise<string> {
  const payload = {
    ...partial,
    // Tests verification fail in verification because iat === now(), so subtract 1s
    iat: Math.round(Date.now() / 1000) - 1,
  };
  return sign(payload, secretKey);
}
