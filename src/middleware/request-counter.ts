import type { RequestHandler } from "express";
import prometheus from "prom-client";
import type { Context } from "#/env";

export function apiRequestsCounter(_context: Context): RequestHandler {
  const counter = new prometheus.Counter({
    name: "api_requests_total",
    help: "Total API requests by id",
    labelNames: ["user_id", "path", "method"],
  });

  const middleware: RequestHandler = (req, _res, next) => {
    if (req.user) {
      counter.inc({
        user_id: req.user.id.toString(),
        path: req.path,
        method: req.method,
      });
    }

    next();
  };

  return middleware;
}
