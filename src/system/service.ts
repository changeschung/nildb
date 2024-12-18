import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NilDid } from "#/common/nil-did";
import type { Context } from "#/env";

export type AboutNode = {
  started: Date;
  build: BuildInfo;
  did: NilDid;
  publicKey: string;
  endpoint: string;
};

type BuildInfo = {
  time: string;
  commit: string;
  version: string;
};

const started = new Date();
let buildInfo: BuildInfo;

export function getNodeInfo(ctx: Context): AboutNode {
  return {
    started,
    build: getBuildInfo(ctx),
    did: ctx.node.identity.did,
    publicKey: ctx.node.identity.publicKey,
    endpoint: ctx.node.endpoint,
  };
}

function getBuildInfo(ctx: Context): BuildInfo {
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
    ctx.log.info("No buildinfo.json found using fallback values");
    buildInfo = {
      time: "1970-01-01T00:00:00Z",
      commit: "unknown",
      version: "0.0.0",
    };
    return buildInfo;
  }
}

export const SystemService = {
  getNodeInfo,
};
