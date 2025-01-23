import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { AdminEndpointV1 } from "#/admin/routes";
import { isRoleAllowed } from "#/middleware/auth";
import * as QueriesController from "#/queries/controllers";

export const QueriesEndpointV1 = {
  Base: "/api/v1/queries",
  Execute: "/api/v1/queries/execute",
} as const;

export function buildQueriesRouter(): Router {
  const router = Router();

  router.use(AdminEndpointV1.Base, (req, res, next): void => {
    if (!isRoleAllowed(req, ["organization"])) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }
    next();
  });

  router.get(QueriesEndpointV1.Base, QueriesController.listQueries);
  router.post(QueriesEndpointV1.Base, QueriesController.addQuery);
  router.delete(QueriesEndpointV1.Base, QueriesController.deleteQuery);
  router.post(QueriesEndpointV1.Execute, QueriesController.executeQuery);

  return router;
}
