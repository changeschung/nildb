import { Router } from "express";
import {
  createDataController,
  deleteDataController,
  flushDataController,
  readDataController,
  tailDataController,
  updateDataController,
} from "./controllers";

export const DataEndpointV1 = {
  Create: "/api/v1/data/create",
  Read: "/api/v1/data/read",
  Update: "/api/v1/data/update",
  Delete: "/api/v1/data/delete",
  Flush: "/api/v1/data/flush",
  Tail: "/api/v1/data/tail",
} as const;

export function buildDataRouter(): Router {
  const router = Router();

  router.post(DataEndpointV1.Create, createDataController);
  router.post(DataEndpointV1.Read, readDataController);
  router.post(DataEndpointV1.Update, updateDataController);
  router.post(DataEndpointV1.Delete, deleteDataController);

  router.post(DataEndpointV1.Flush, flushDataController);
  router.post(DataEndpointV1.Tail, tailDataController);

  return router;
}
