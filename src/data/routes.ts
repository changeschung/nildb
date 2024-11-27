import { Router } from "express";
import {
  createDataController,
  deleteDataController,
  flushDataController,
  readDataController,
  tailDataController,
} from "./controllers";

export const DataEndpoint = {
  Create: "/data/create",
  Read: "/data/read",
  Delete: "/data/delete",
  Flush: "/data/flush",
  Tail: "/data/tail",
} as const;

export function buildDataRouter(): Router {
  const router = Router();

  router.post(DataEndpoint.Create, createDataController);
  router.post(DataEndpoint.Read, readDataController);
  router.post(DataEndpoint.Delete, deleteDataController);

  router.post(DataEndpoint.Flush, flushDataController);
  router.post(DataEndpoint.Tail, tailDataController);

  return router;
}
