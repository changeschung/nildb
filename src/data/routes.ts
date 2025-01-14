import { Router } from "express";
import { DataController } from "#/data/controllers";

export const DataEndpointV1 = {
  Upload: "/api/v1/data/create",
  Read: "/api/v1/data/read",
  Update: "/api/v1/data/update",
  Delete: "/api/v1/data/delete",
  Flush: "/api/v1/data/flush",
  Tail: "/api/v1/data/tail",
} as const;

export function buildDataRouter(): Router {
  const router = Router();

  router.post(DataEndpointV1.Upload, DataController.uploadData);
  router.post(DataEndpointV1.Read, DataController.readData);
  router.post(DataEndpointV1.Update, DataController.updateData);
  router.post(DataEndpointV1.Delete, DataController.deleteData);

  router.post(DataEndpointV1.Flush, DataController.flushData);
  router.post(DataEndpointV1.Tail, DataController.tailData);

  return router;
}
