import fs from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import { swaggerUI } from "@hono/swagger-ui";
import yaml from "js-yaml";
import type { App } from "#/app";
import { PathsV1 } from "#/common/paths";
import type { AppBindings } from "#/env";

export function createOpenApiRouter(app: App, _bindings: AppBindings): void {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);
  const openApiPath = nodePath.join(__dirname, "./openapi.yaml");
  const openApiYaml = fs.readFileSync(openApiPath, "utf8");
  const spec = yaml.load(openApiYaml) as object;

  app.use(`${PathsV1.docs}/*`, swaggerUI({ url: "", spec }));
}
