import type { App } from "#/app";
import { SystemEndpoint } from "#/system/system.router";
import * as SystemService from "./system.services";

export function aboutNode(app: App): void {
  app.get(SystemEndpoint.About, (c): Response => {
    const aboutNode = SystemService.getNodeInfo(c.env);
    return c.json(aboutNode);
  });
}

export function healthCheck(app: App): void {
  app.get(SystemEndpoint.Health, (c) => c.text("OK"));
}
