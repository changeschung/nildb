import { Router } from "express";
import {
  addSchemaController,
  deleteSchemaController,
  listSchemasController,
} from "#/schemas/controllers";

export const SchemasEndpointV1 = {
  Base: "/api/v1/schemas",
} as const;

export function buildSchemasRouter(): Router {
  const router = Router();

  router.get(SchemasEndpointV1.Base, listSchemasController);
  router.post(SchemasEndpointV1.Base, addSchemaController);
  router.delete(SchemasEndpointV1.Base, deleteSchemaController);

  return router;
}
