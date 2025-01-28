import fs from "node:fs";
import nodePath from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import swaggerUi from "swagger-ui-express";

export const serveApiDocsController = () => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = nodePath.dirname(__filename);
  const openApiPath = nodePath.join(__dirname, "./openapi.yaml");
  const openApiYaml = fs.readFileSync(openApiPath, "utf8");
  const openApiSpec = yaml.load(openApiYaml) as object;

  return swaggerUi.setup(openApiSpec);
};
