import { Router } from "express";
import { StatusCodes } from "http-status-codes";
import { isRoleAllowed } from "#/middleware/auth";
import * as DataController from "./controllers";

export const DataEndpointV1 = {
  Base: "/api/v1/data",
  Upload: "/api/v1/data/create",
  Read: "/api/v1/data/read",
  Update: "/api/v1/data/update",
  Delete: "/api/v1/data/delete",
  Flush: "/api/v1/data/flush",
  Tail: "/api/v1/data/tail",
} as const;

export function buildDataRouter(): Router {
  const router = Router();

  router.use(DataEndpointV1.Base, (req, res, next): void => {
    if (!isRoleAllowed(req, ["organization"])) {
      res.sendStatus(StatusCodes.UNAUTHORIZED);
      return;
    }
    next();
  });

  router.post(DataEndpointV1.Upload, DataController.uploadData);
  router.post(DataEndpointV1.Read, DataController.readData);
  router.post(DataEndpointV1.Update, DataController.updateData);
  router.post(DataEndpointV1.Delete, DataController.deleteData);

  router.post(DataEndpointV1.Flush, DataController.flushData);
  router.post(DataEndpointV1.Tail, DataController.tailData);

  return router;
}
