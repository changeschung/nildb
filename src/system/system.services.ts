import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Effect as E, pipe } from "effect";
import type { AdminSetMaintenanceWindowRequest } from "#/admin/admin.types";
import {
  DataValidationError,
  type DatabaseError,
  type DocumentNotFoundError,
  type PrimaryCollectionNotFoundError,
} from "#/common/errors";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";
import * as SystemRepository from "./system.repository";

export type AboutNode = {
  started: Date;
  build: BuildInfo;
  did: NilDid;
  publicKey: string;
  url: string;
};

type BuildInfo = {
  time: string;
  commit: string;
  version: string;
};

const started = new Date();
let buildInfo: BuildInfo;

export function getNodeInfo(bindings: AppBindings): AboutNode {
  return {
    started,
    build: getBuildInfo(bindings),
    did: bindings.node.identity.did,
    publicKey: bindings.node.identity.pk,
    url: bindings.node.endpoint,
  };
}

function getBuildInfo(bindings: AppBindings): BuildInfo {
  if (buildInfo) {
    return buildInfo;
  }

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const buildInfoPath = path.join(__dirname, "../../buildinfo.json");
    const content = fs.readFileSync(buildInfoPath, "utf-8");
    return JSON.parse(content) as BuildInfo;
  } catch (_error) {
    bindings.log.info("No buildinfo.json found using fallback values");
    buildInfo = {
      time: "1970-01-01T00:00:00Z",
      commit: "unknown",
      version: "0.0.0",
    };
    return buildInfo;
  }
}

export function setMaintenanceWindow(
  ctx: AppBindings,
  request: AdminSetMaintenanceWindowRequest,
): E.Effect<
  boolean,
  | DocumentNotFoundError
  | DataValidationError
  | PrimaryCollectionNotFoundError
  | DatabaseError
> {
  return pipe(
    E.succeed(request),
    E.flatMap((request) => {
      if (request.id !== ctx.node.identity.did) {
        return E.fail(
          new DataValidationError({
            issues: ["DID prohibited"],
            cause: request,
          }),
        );
      }

      const now = new Date();
      if (request.end < now || request.end <= request.start) {
        return E.fail(
          new DataValidationError({
            issues: ["End date must be in the future and after the start date"],
            cause: request,
          }),
        );
      }

      return E.succeed(request);
    }),
    E.flatMap((request) => SystemRepository.setMaintenanceWindow(ctx, request)),
    E.tap(() => {
      ctx.log.debug(
        `Set maintenance window.start=${request.start.toISOString()} and window.end=${request.end.toISOString()} for node: ${request.id}`,
      );
    }),
  );
}

type MaintenanceStatus = {
  active: boolean;
};

export function getMaintenanceStatus(
  ctx: AppBindings,
): E.Effect<MaintenanceStatus, PrimaryCollectionNotFoundError | DatabaseError> {
  return pipe(
    SystemRepository.findMaintenanceWindow(ctx),
    E.flatMap((window) => {
      const maintenanceStatus = { active: false };

      if (!window) {
        return E.succeed(maintenanceStatus);
      }

      const now = new Date();
      maintenanceStatus.active = now >= window.start && now <= window.end;
      return E.succeed(maintenanceStatus);
    }),
  );
}
