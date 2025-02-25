import type { App } from "#/app";
import type { AppBindings } from "#/env";
import * as AccountController from "./accounts.controllers";

export function buildAccountsRouter(app: App, _bindings: AppBindings): void {
  AccountController.get(app);
  AccountController.register(app);
  AccountController.remove(app);
  AccountController.setPublicKey(app);
  AccountController.getSubscription(app);
}
