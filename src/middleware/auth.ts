import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { UUID } from "mongodb";
import { AuthEndpoints } from "#/auth/routes";
import type { UuidDto } from "#/common/types";
import { ApiDocsEndpoint } from "#/docs/routes";
import type { Context } from "#/env";
import { SystemEndpoint } from "#/system/routes";

export type JwtPayload = {
  sub: UuidDto;
  iat: number;
  type: "root" | "admin" | "access-token";
};
export type JwtSerialized = string;
type Role = JwtPayload["type"];

// Uses global interface merging so Request is aware of auth on request
declare global {
  namespace Express {
    interface Request {
      auth: JwtPayload;
      user: {
        id: UUID;
        role: Role;
      };
    }
  }
}

type Routes = string[];

export function useAuthMiddleware(context: Context): RequestHandler {
  const publicPaths: Routes = [
    SystemEndpoint.Health,
    SystemEndpoint.About,
    ApiDocsEndpoint.Docs,
    `/api/v1${AuthEndpoints.Login}`,
  ];

  const acl: Record<Role, Routes> = {
    root: ["/metrics", "/api/v1/users"],
    admin: ["/metrics", "/api/v1/users", "/api/v1/organizations"],
    "access-token": ["/api/v1/schemas", "/api/v1/queries", "/api/v1/data"],
  };

  return (req, res, next) => {
    try {
      const path = req.path;
      const isPublic = publicPaths.some((p) => path.startsWith(p));
      if (isPublic) {
        next();
        return;
      }

      const header = req.headers.authorization ?? "";
      const [scheme, token] = header.split(" ");
      if (scheme.toLowerCase() !== "bearer") {
        res.sendStatus(401);
        return;
      }

      const payload = jwt.verify(token, context.config.jwtSecret) as JwtPayload;
      if (!payload) {
        res.sendStatus(401);
        return;
      }

      const authorized = acl[payload.type]?.some((p) => path.startsWith(p));

      if (!authorized) {
        res.sendStatus(401);
        return;
      }

      req.auth = payload;
      req.user = {
        id: new UUID(payload.sub),
        role: payload.type,
      };

      context.log.debug(
        `Authorised: path=${path} type=${payload.type} id=${payload.sub}`,
      );

      next();
    } catch (_error) {
      res.sendStatus(401);
    }
  };
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
