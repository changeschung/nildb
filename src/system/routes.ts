import { Router } from "express";
import { aboutNodeController, healthCheckController } from "./controllers";

export const SystemEndpoint = {
  Health: "/health",
  About: "/about",
} as const;

export function createSystemRouter(): Router {
  const router = Router();

  router.get(SystemEndpoint.Health, healthCheckController);
  router.get(SystemEndpoint.About, aboutNodeController);

  return router;
}
