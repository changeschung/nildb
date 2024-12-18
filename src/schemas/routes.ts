import { Router } from "express";
import { SchemasController } from "#/schemas/controllers";

export const SchemasEndpointV1 = {
  Base: "/api/v1/schemas",
} as const;

export function buildSchemasRouter(): Router {
  const router = Router();

  router.get(SchemasEndpointV1.Base, SchemasController.listSchemas);
  router.post(SchemasEndpointV1.Base, SchemasController.addSchema);
  router.delete(SchemasEndpointV1.Base, SchemasController.deleteSchema);

  return router;
}
