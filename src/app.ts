import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Db, MongoClient, UUID } from "mongodb";
import type { Logger } from "pino";
import { dataHandleDelete } from "#/handlers/data-handle-delete";
import { dataHandleFlush } from "#/handlers/data-handle-flush";
import { dataHandleTail } from "#/handlers/data-handle-tail";
import { queriesHandleExecute } from "#/handlers/queries-handle-execute";
import type { Bindings } from "./env";
import { adminHandleHealthCheck } from "./handlers/admin-handle-health-check";
import { handleOpenApi } from "./handlers/admin-handle-openapi";
import { authHandleLogin } from "./handlers/auth-handle-login";
import { authMiddleware } from "./handlers/auth-middleware";
import { dataHandleUpload } from "./handlers/data-handle-upload";
import { organizationsHandleCreate } from "./handlers/organizations-handle-create";
import { organizationsHandleCreateAccessToken } from "./handlers/organizations-handle-create-access-token";
import { organizationsHandleDelete } from "./handlers/organizations-handle-delete";
import { organizationsHandleList } from "./handlers/organizations-handle-list";
import { queriesHandleAdd } from "./handlers/queries-handle-add";
import { queriesHandleDelete } from "./handlers/queries-handle-delete";
import { queriesHandleList } from "./handlers/queries-handle-list";
import { schemasHandleAdd } from "./handlers/schemas-handle-add";
import { schemasHandleDelete } from "./handlers/schemas-handle-delete";
import { schemasHandleList } from "./handlers/schemas-handle-list";
import { usersHandleCreate } from "./handlers/users-handle-create";
import { usersHandleDelete } from "./handlers/users-handle-delete";
import { logging } from "./logging";

export type Variables = {
  db: {
    // Default db is the primary (eg `datablocks`)
    client: MongoClient;
    // Holds organizations, users, schemas, queries collections (eg `datablocks`)
    primary: Db;
    // Holds schema data (eg `datablocks_data`)
    data: Db;
  };
  Log: Logger<never, boolean>;
  subject?: UUID;
};

export type AppEnv = {
  Bindings: Bindings;
  Variables: Variables;
};

export function buildApp(
  bindings: Bindings,
  variables: Variables,
): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use("*", async (c, next) => {
    c.env = bindings;
    c.set("db", variables.db);
    c.set("Log", variables.Log);
    await next();
  });

  app.use(logging());

  app.use("/api/*", cors());

  adminHandleHealthCheck(app, "/health");
  handleOpenApi(app, "/openapi");

  authHandleLogin(app, "/api/v1/auth/login");
  authMiddleware(app, bindings.jwtSecret);

  // TODO add ACL for endpoints (eg admin only, api-key only, etc)
  // TODO /api/v1/data DELETE id = ...

  usersHandleCreate(app, "/api/v1/users");
  usersHandleDelete(app, "/api/v1/users");

  organizationsHandleCreate(app, "/api/v1/organizations");
  organizationsHandleDelete(app, "/api/v1/organizations");
  organizationsHandleList(app, "/api/v1/organizations");
  organizationsHandleCreateAccessToken(
    app,
    "/api/v1/organizations/access-tokens",
  );

  schemasHandleAdd(app, "/api/v1/schemas");

  // TODO if delete schema check no dependent queries
  schemasHandleDelete(app, "/api/v1/schemas");
  schemasHandleList(app, "/api/v1/schemas");

  dataHandleUpload(app, "/api/v1/data");
  dataHandleTail(app, "/api/v1/data/tail");
  dataHandleFlush(app, "/api/v1/data/flush");
  dataHandleDelete(app, "/api/v1/data/delete");

  queriesHandleAdd(app, "/api/v1/queries");
  queriesHandleList(app, "/api/v1/queries");
  queriesHandleDelete(app, "/api/v1/queries");
  queriesHandleExecute(app, "/api/v1/queries/execute");

  return app;
}
