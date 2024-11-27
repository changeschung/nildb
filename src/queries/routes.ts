import { Router } from "express";
import {
  addQueryController,
  deleteQueryController,
  executeQueryController,
  listQueriesController,
} from "#/queries/controllers";

export const QueriesEndpoint = {
  Add: "/queries",
  Delete: "/queries",
  List: "/queries",
  Execute: "/queries/execute",
} as const;

export function buildQueriesRouter(): Router {
  const router = Router();

  router.post(QueriesEndpoint.Add, addQueryController);
  router.get(QueriesEndpoint.List, listQueriesController);
  router.delete(QueriesEndpoint.Delete, deleteQueryController);
  router.post(QueriesEndpoint.Execute, executeQueryController);

  return router;
}
