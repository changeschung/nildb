import type { JWTPayload } from "did-jwt";
import * as didJwt from "did-jwt";
import { Resolver } from "did-resolver";
import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { AccountDocument, AccountType } from "#/accounts/repository";
import { findAccountByDid } from "#/accounts/service";
import { type NilDid, buildNilMethodResolver } from "#/common/nil-did";
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
        findAccountByDid(ctx, payload.iss as NilDid),
        E.runPromise,
      );
      req.auth = payload;
      req.account = account;

      // individual routes are expected to apply acls from this point
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
