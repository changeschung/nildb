import { Router } from "express";
import { QueriesController } from "#/queries/controllers";

export const QueriesEndpointV1 = {
  Base: "/api/v1/queries",
  Execute: "/api/v1/queries/execute",
} as const;

export function buildQueriesRouter(): Router {
  const router = Router();

  router.get(QueriesEndpointV1.Base, QueriesController.listQueries);
  router.post(QueriesEndpointV1.Execute, QueriesController.executeQuery);

  return router;
}
