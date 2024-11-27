import { Router } from "express";
import {
  deleteDataController,
  flushDataController,
  tailDataController,
  uploadDataController,
} from "./controllers";

export const DataEndpoint = {
  Upload: "/data",
  Delete: "/data/delete",
  Flush: "/data/flush",
  Tail: "/data/tail",
} as const;

export function buildDataRouter(): Router {
  const router = Router();

  router.post(DataEndpoint.Upload, uploadDataController);
  router.post(DataEndpoint.Delete, deleteDataController);
  router.post(DataEndpoint.Flush, flushDataController);
  router.post(DataEndpoint.Tail, tailDataController);

  return router;
}
