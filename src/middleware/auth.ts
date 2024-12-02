import type { RequestHandler } from "express";
import { expressjwt } from "express-jwt";
import jwt from "jsonwebtoken";
import type { UUID } from "mongodb";
import type { z } from "zod";
import { AuthEndpoints } from "#/auth/routes";
import { Uuid, type UuidDto } from "#/common/types";
import { ApiDocsEndpoint } from "#/docs/routes";
import type { Context } from "#/env";
import { SystemEndpoint } from "#/system/routes";

export type JwtPayload = {
  sub: UuidDto;
  iat: number;
  type: "root" | "admin" | "access-token";
};
export type JwtSerialized = string;

// Uses global interface merging so Request is aware of auth on request
declare global {
  namespace Express {
    interface Request {
      auth: JwtPayload;
      user: {
        sub: UUID;
      };
    }
  }
}

export function useAuthMiddleware(context: Context): RequestHandler[] {
  const publicPaths = [
    SystemEndpoint.Health,
    SystemEndpoint.About,
    // swagger ui serves assets at nested paths
    new RegExp(`^${ApiDocsEndpoint.Docs}(?:\/.*)?`),
    `/api/v1${AuthEndpoints.Login}`,
  ];

  const deserializeUser: RequestHandler = (req, res, next) => {
    if (req.auth) {
      req.user = {
        sub: Uuid.parse(req.auth.sub),
      };
    }
    next();
  };

  return [
    expressjwt({
      secret: context.config.jwtSecret,
      algorithms: ["HS256"],
    }).unless({ path: publicPaths }),
    deserializeUser,
  ] as RequestHandler[];
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
