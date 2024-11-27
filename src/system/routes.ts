import { Router } from "express";
import { healthCheckController, versionController } from "./controllers";

export const SystemEndpoint = {
  Health: "/health",
  Version: "/version",
} as const;

export function createSystemRouter(): Router {
  const router = Router();

  router.get(SystemEndpoint.Health, healthCheckController);
  router.get(SystemEndpoint.Version, versionController);

  return router;
}
