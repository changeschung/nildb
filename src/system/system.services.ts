import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NilDid } from "#/common/nil-did";
import type { AppBindings } from "#/env";

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
