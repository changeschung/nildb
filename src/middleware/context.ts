import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { Context } from "#/env";

// Uses global interface merging so Request is aware of Context in controllers
declare global {
  namespace Express {
    interface Request {
      context: Context;
    }
  }
}

export function useContextMiddleware(context: Context): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.context = context;
    next();
  };
}
