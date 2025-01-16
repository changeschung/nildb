import compression from "compression";
import * as cors from "cors";
import * as express from "express";
import promBundle from "express-prom-bundle";
import prometheus from "prom-client";
import { buildAdminRouter } from "#/admin/routes";
import { apiRequestsCounter } from "#/middleware/request-counter";
import { buildAccountsRouter } from "./accounts/routes";
import { buildDataRouter } from "./data/routes";
import { buildApiDocsRoutes } from "./docs/routes";
import type { Context } from "./env";
import { useAuthMiddleware } from "./middleware/auth";
import { useContextMiddleware } from "./middleware/context";
import { loggerMiddleware } from "./middleware/logger";
import { buildQueriesRouter } from "./queries/routes";
import { buildSchemasRouter } from "./schemas/routes";
import { SystemEndpoint, createSystemRouter } from "./system/routes";

type App = {
  app: express.Application;
  metrics: express.Application;
};

export function buildApp(ctx: Context): App {
  // Order impacts behaviour so be thoughtful if reordering this function
  const app = express.default();
  app.disable("x-powered-by");
  app.use(compression());

  // A CORS workaround so that the demo node can be queried from docs
  if (
    ctx.node.endpoint.toLowerCase() === "https://nildb-demo.nillion.network"
  ) {
    app.use(
      cors.default({
        origin: [
          "https://docs.nillion.com",
          "https://nillion-docs-git-feat-open-api-integration-nillion.vercel.app",
        ],
        allowedHeaders: ["Content-Type", "Authorization"],
        methods: ["GET", "POST", "DELETE"],
        maxAge: 3600,
        credentials: true,
      }),
    );
  }

  app.use(useContextMiddleware(ctx));
  app.use(createSystemRouter());

  app.use(loggerMiddleware(ctx.config));
  app.use(useAuthMiddleware(ctx));

  prometheus.register.setDefaultLabels({
    node: ctx.node.identity.did,
  });
  const metrics = promBundle({
    autoregister: false,
    includeMethod: true,
    includePath: true,
  });
  app.use(metrics);
  app.use(apiRequestsCounter(ctx));

  app.use(buildApiDocsRoutes());
  app.use(express.json({ limit: "17mb" }));

  app.use(buildAdminRouter());
  app.use(buildAccountsRouter());
  app.use(buildSchemasRouter());

  app.use(buildQueriesRouter());
  app.use(buildDataRouter());

  const metricsApp = express.default();
  metricsApp.use(SystemEndpoint.Metrics, metrics.metricsMiddleware);

  return { app, metrics: metricsApp };
}
