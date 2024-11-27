import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { serveApiDocsController } from "#/docs/controllers";

export const ApiDocsEndpoint = {
  Docs: "/api-docs",
} as const;

export function buildApiDocsRoutes() {
  const router = Router();

  router.use(ApiDocsEndpoint.Docs, swaggerUi.serve);
  router.get(ApiDocsEndpoint.Docs, serveApiDocsController());

  return router;
}
