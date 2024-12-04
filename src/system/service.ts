import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Context } from "#/env";

export type AboutNode = {
  started: Date;
  build: BuildInfo;
  address: string;
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

export function getNodeInfo(context: Context): AboutNode {
  return {
    started,
    build: getBuildInfo(context),
    address: context.node.address,
    publicKey: context.node.publicKey,
    endpoint: context.node.endpoint,
  };
}

function getBuildInfo(context: Context): BuildInfo {
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
    context.log.info("No buildinfo.json found using fallback values");
    buildInfo = {
      time: "1970-01-01T00:00:00Z",
      commit: "unknown",
      version: "0.0.0",
    };
    return buildInfo;
  }
}
