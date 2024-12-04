import compression from "compression";
import * as express from "express";
import { Router } from "express";
import promBundle from "express-prom-bundle";
import prometheus from "prom-client";
import { apiRequestsCounter } from "#/middleware/request-counter";
import { buildAuthRouter } from "./auth/routes";
import { buildDataRouter } from "./data/routes";
import { buildApiDocsRoutes } from "./docs/routes";
import type { Context } from "./env";
import { useAuthMiddleware } from "./middleware/auth";
import { useContextMiddleware } from "./middleware/context";
import { loggerMiddleware } from "./middleware/logger";
import { buildOrganizationsRouter } from "./organizations/routes";
import { buildQueriesRouter } from "./queries/routes";
import { buildSchemasRouter } from "./schemas/routes";
import { createSystemRouter } from "./system/routes";
import { buildUsersRouter } from "./users/routes";

type App = {
  app: express.Application;
  metrics: express.Application;
};

export function buildApp(context: Context): App {
  // Order impacts behaviour so be thoughtful if reordering this function
  const app = express.default();
  app.disable("x-powered-by");
  app.use(compression());

  app.use(useContextMiddleware(context));
  app.use(createSystemRouter());

  app.use(loggerMiddleware(context.config));
  app.use(useAuthMiddleware(context));

  prometheus.register.setDefaultLabels({
    node: context.node.address,
  });
  const metrics = promBundle({
    autoregister: false,
    includeMethod: true,
    includePath: true,
  });
  app.use(metrics);
  app.use(apiRequestsCounter(context));

  app.use(buildApiDocsRoutes());
  app.use(express.json({ limit: "10mb" }));

  const v1Router = Router();

  v1Router.use(buildAuthRouter());
  v1Router.use(buildUsersRouter());
  v1Router.use(buildOrganizationsRouter());
  v1Router.use(buildSchemasRouter());
  v1Router.use(buildQueriesRouter());
  v1Router.use(buildDataRouter());

  app.use("/api/v1", v1Router);

  const metricsApp = express.default();
  metricsApp.use("/metrics", metrics.metricsMiddleware);

  return { app, metrics: metricsApp };
}
