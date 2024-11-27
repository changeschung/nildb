import * as express from "express";
import { Router } from "express";
import { buildAuthRouter } from "./auth/routes";
import { buildDataRouter } from "./data/routes";
import { buildApiDocsRoutes } from "./docs/routes";
import { useAuthMiddleware } from "./middleware/auth";
import { useContextMiddleware } from "./middleware/context";
import { buildOrganizationsRouter } from "./organizations/routes";
import { buildQueriesRouter } from "./queries/routes";
import { buildSchemasRouter } from "./schemas/routes";
import { buildUsersRouter } from "./users/routes";
import type { Context } from "./env";
import { loggerMiddleware } from "./middleware/logger";
import { createSystemRouter } from "./system/routes";

export function buildApp(context: Context): express.Application {
  const app = express.default();

  app.use(useContextMiddleware(context));
  app.use(loggerMiddleware(context.config));
  app.use(useAuthMiddleware(context));

  app.use(createSystemRouter());
  app.use(buildApiDocsRoutes());
  app.use(express.json());

  const v1Router = Router();

  v1Router.use(buildAuthRouter());
  v1Router.use(buildUsersRouter());
  v1Router.use(buildOrganizationsRouter());
  v1Router.use(buildSchemasRouter());
  v1Router.use(buildQueriesRouter());
  v1Router.use(buildDataRouter());

  app.use("/api/v1", v1Router);

  return app;
}
