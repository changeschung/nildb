import type { RequestHandler } from "express";
import { expressjwt } from "express-jwt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AuthEndpoints } from "#/auth/routes";
import { Uuid } from "#/common/types";
import { ApiDocsEndpoint } from "#/docs/routes";
import type { Context } from "#/env";
import { SystemEndpoint } from "#/system/routes";

export const JwtPayload = z.object({
  sub: Uuid,
  iat: z.number().int(),
  type: z.enum(["root", "admin", "access-token"]),
});
export type JwtPayload = z.infer<typeof JwtPayload>;
export type JwtSerialized = string;

// Uses global interface merging so Request is aware of auth on request
declare global {
  namespace Express {
    interface Request {
      auth: JwtPayload;
    }
  }
}

export function useAuthMiddleware(context: Context): RequestHandler {
  const publicPaths = [
    SystemEndpoint.Health,
    SystemEndpoint.Version,
    // swagger ui serves assets at nested paths
    new RegExp(`^${ApiDocsEndpoint.Docs}(?:\/.*)?`),
    `/api/v1${AuthEndpoints.Login}`,
  ];

  return expressjwt({
    secret: context.config.jwtSecret,
    algorithms: ["HS256"],
  }).unless({ path: publicPaths }) as RequestHandler;
}

export function createJwt(
  partial: Partial<JwtPayload>,
  secretKey: string,
): string {
  const payload = {
    ...partial,
    // Subtract 1s to account so tests pass verification (otherwise iat === now())
    iat: Math.round(Date.now() / 1000) - 1,
  };
  return jwt.sign(payload, secretKey);
}
