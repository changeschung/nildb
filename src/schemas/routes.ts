import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AdminEndpointV1 } from "#/admin/routes";
import { isRoleAllowed } from "#/middleware/auth";
import { SchemasController } from "#/schemas/controllers";

export const SchemasEndpointV1 = {
  Base: "/api/v1/schemas",
} as const;

export function buildSchemasRouter(): Router {
  const router = Router();

  router.use(AdminEndpointV1.Base, (req, res, next): void => {
    if (!isRoleAllowed(req, ["organization"])) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }
    next();
  });

  router.get(SchemasEndpointV1.Base, SchemasController.listSchemas);

  return router;
}
