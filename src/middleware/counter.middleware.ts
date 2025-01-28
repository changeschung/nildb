import type { RequestHandler } from "express";
import prometheus from "prom-client";
import type { Context } from "#/env";

export function apiRequestsCounter(ctx: Context): RequestHandler {
  const counter = new prometheus.Counter({
    name: "api_requests_total",
    help: "Total API requests by id",
    labelNames: ["user_id", "path", "method"],
  });

  const middleware: RequestHandler = (req, _res, next) => {
    const { account, path, method } = req;
    if (account) {
      let user_id = ctx.node.identity.did;
      if (account._type !== "root") {
        user_id = account._id;
      }
      counter.inc({
        user_id,
        path,
        method,
      });
    }

    next();
  };

  return middleware;
}
