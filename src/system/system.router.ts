import type { App } from "#/app";
import type { AppBindings } from "#/env";
import * as SystemController from "./system.controllers";

export const SystemEndpoint = {
  About: "/about",
  Health: "/health",
  Metrics: "/metrics",
} as const;

export function buildSystemRouter(app: App, _bindings: AppBindings): void {
  SystemController.aboutNode(app);
  SystemController.healthCheck(app);
}
