import { Effect as E, pipe } from "effect";
import { StatusCodes } from "http-status-codes";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import { payloadValidator } from "#/common/zod-utils";
import * as SystemService from "#/system/system.services";
import { AdminSetMaintenanceWindowRequestSchema } from "./admin.types";

export function setMaintenanceWindow(app: App): void {
  app.put(
    PathsV1.admin.system.maintenance,
    payloadValidator(AdminSetMaintenanceWindowRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");
      return pipe(
        SystemService.setMaintenanceWindow(c.env, payload),
        E.map(() => new Response(null, { status: StatusCodes.OK })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function deleteMaintenanceWindow(app: App): void {
  app.delete(PathsV1.admin.system.maintenance, async (c) =>
    pipe(
      SystemService.deleteMaintenanceWindow(c.env),
      E.map(() => new Response(null, { status: StatusCodes.NO_CONTENT })),
      handleTaggedErrors(c),
      E.runPromise,
    ),
  );
}
