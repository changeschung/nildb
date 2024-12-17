import type { RequestHandler } from "express";
import prometheus from "prom-client";
import type { Context } from "#/env";

export function apiRequestsCounter(_ctx: Context): RequestHandler {
  const counter = new prometheus.Counter({
    name: "api_requests_total",
    help: "Total API requests by id",
    labelNames: ["user_id", "path", "method"],
  });

  const middleware: RequestHandler = (req, _res, next) => {
    if (req.account) {
      let user_id = req.ctx.node.identity.did;
      if (req.account._type !== "root") {
        user_id = req.account._id;
      }
      counter.inc({
        user_id,
        path: req.path,
        method: req.method,
      });
    }

    next();
  };

  return middleware;
}
