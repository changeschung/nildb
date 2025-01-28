import { Router } from "express";
import * as SystemController from "./system.controllers";

export const SystemEndpoint = {
  About: "/about",
  Health: "/health",
  Metrics: "/metrics",
} as const;

export function createSystemRouter(): Router {
  const router = Router();

  router.get(SystemEndpoint.About, SystemController.aboutNodeController);
  router.get(SystemEndpoint.Health, SystemController.healthCheckController);

  return router;
}
