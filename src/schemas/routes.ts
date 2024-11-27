import { Router } from "express";
import {
  addSchemaController,
  deleteSchemaController,
  listSchemasController,
} from "#/schemas/controllers";

export const SchemasEndpoint = {
  Add: "/schemas",
  List: "/schemas",
  Delete: "/schemas",
} as const;

export function buildSchemasRouter(): Router {
  const router = Router();

  router.post(SchemasEndpoint.Add, addSchemaController);
  router.get(SchemasEndpoint.List, listSchemasController);
  router.delete(SchemasEndpoint.Delete, deleteSchemaController);

  return router;
}
