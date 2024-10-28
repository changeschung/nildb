import type { Hono } from "hono";
import type { AppEnv } from "#/app";

export type HealthCheckPath = "/health";

export function handleHealthCheck(
  app: Hono<AppEnv>,
  path: HealthCheckPath,
): void {
  app.get(path, (c) => {
    return c.text("OK");
  });
}
