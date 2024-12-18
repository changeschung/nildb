import type { JWTPayload } from "did-jwt";
import * as didJwt from "did-jwt";
import { Resolver } from "did-resolver";
import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
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

type Routes = string[];

export function useAuthMiddleware(ctx: Context): RequestHandler {
  const publicPaths: Routes = [
    SystemEndpoint.Health,
    SystemEndpoint.About,
    ApiDocsEndpoint.Docs,
    AccountsEndpointV1.Register,
  ];

  const resolver = new Resolver({ nil: buildNilMethodResolver(ctx).resolve });

  return async (req, res, next) => {
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

      const { payload } = await didJwt.verifyJWT(token, {
        audience: ctx.node.identity.did,
        resolver,
      });

      if (!payload) {
        res.sendStatus(401);
        return;
      }

      // this should be a cache hit
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
      res.sendStatus(401);
    }
  };
}

export function isAccountAllowedGuard(
  ctx: Context,
  permitted: AccountType[],
  account: AccountDocument,
): boolean {
  if (permitted.includes(account._type)) {
    return true;
  }
  ctx.log.warn(`Unauthorized: ${account._id}`);

  return false;
}
