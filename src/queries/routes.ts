import { Router } from "express";
import {
  addQueryController,
  deleteQueryController,
  executeQueryController,
  listQueriesController,
} from "#/queries/controllers";

export const QueriesEndpointV1 = {
  Base: "/api/v1/queries",
  Execute: "/api/v1/queries/execute",
} as const;

export function buildQueriesRouter(): Router {
  const router = Router();

  router.get(QueriesEndpointV1.Base, listQueriesController);
  router.post(QueriesEndpointV1.Base, addQueryController);
  router.delete(QueriesEndpointV1.Base, deleteQueryController);
  router.post(QueriesEndpointV1.Execute, executeQueryController);

  return router;
}
