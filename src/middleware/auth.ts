import type { JWTPayload } from "did-jwt";
import * as didJwt from "did-jwt";
import { Resolver } from "did-resolver";
import { Effect as E, pipe } from "effect";
import type { Request, RequestHandler } from "express";
import { StatusCodes } from "http-status-codes";
import { AccountsEndpointV1 } from "#/accounts/routes";
import type { AccountDocument, AccountType } from "#/admin/repository";
import { findAccountByIdWithCache } from "#/common/cache";
import { NilDid, buildNilMethodResolver } from "#/common/nil-did";
import { ApiDocsEndpoint } from "#/docs/routes";
import type { Context } from "#/env";
import { SystemEndpoint } from "#/system/routes";

// Uses global interface merging so Request is aware of auth on request
declare global {
  namespace Express {
    interface Request {
      auth: JWTPayload;
      account: AccountDocument;
    }
  }
}

type Routes = {
  path: string;
  method: "GET" | "POST" | "DELETE";
}[];

export function isPublicPath(req: Request): boolean {
  // this is in the function because otherwise there are import resolution
  // order issues and some values end up as undefined
  const publicPaths: Routes = [
    { path: SystemEndpoint.Health, method: "GET" },
    { path: SystemEndpoint.About, method: "GET" },
    { path: ApiDocsEndpoint.Docs, method: "GET" },
    { path: AccountsEndpointV1.Base, method: "POST" },
  ];

  return publicPaths.some(({ path, method }) => {
    return method === req.method && req.path.startsWith(path);
  });
}

export function useAuthMiddleware(ctx: Context): RequestHandler {
  const resolver = new Resolver({ nil: buildNilMethodResolver(ctx).resolve });

  return async (req, res, next) => {
    try {
      if (isPublicPath(req)) {
        next();
        return;
      }

      const header = req.headers.authorization ?? "";
      const [scheme, token] = header.split(" ");
      if (scheme.toLowerCase() !== "bearer") {
        res.sendStatus(StatusCodes.UNAUTHORIZED);
        return;
      }

      const { payload } = await didJwt.verifyJWT(token, {
        audience: ctx.node.identity.did,
        resolver,
      });

      if (!payload) {
        res.sendStatus(StatusCodes.UNAUTHORIZED);
        return;
      }

      // this should be a cache hit because the resolver ensures the account is loaded
      const account = await pipe(
        findAccountByIdWithCache(ctx, NilDid.parse(payload.iss)),
        E.runPromise,
      );
      req.auth = payload;
      req.account = account;

      // individual routes to apply Acls from this point
      next();
    } catch (error) {
      console.error(error);
      res.sendStatus(StatusCodes.UNAUTHORIZED);
    }
  };
}

export function isRoleAllowed(req: Request, permitted: AccountType[]): boolean {
  const { ctx, account, path } = req;

  if (permitted.includes(account._type)) {
    return true;
  }

  ctx.log.warn(
    `Unauthorized(account=${account._id},type=${account._type},path=${path}`,
  );
  return false;
}
