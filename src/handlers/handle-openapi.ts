import fs from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { swaggerUI } from "@hono/swagger-ui";
import type { Hono } from "hono";
import yaml from "js-yaml";
import type { AppEnv } from "#/app";

export type OpenApiSpecPath = "/openapi/spec";
export type OpenApiUiPath = "/openapi";

export function handleOpenApi(app: Hono<AppEnv>, path: OpenApiUiPath): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);
  const openApiPath = nodePath.join(__dirname, "../../docs/openapi.yaml");
  const openApiYaml = fs.readFileSync(openApiPath, "utf8");
  const openApiSpec = yaml.load(openApiYaml) as object;

  app.get("/openapi/spec", (c) => {
    return c.json(openApiSpec);
  });

  app.get(path, swaggerUI({ url: "/openapi/spec" }));
}
