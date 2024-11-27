import type { Request, Response } from "express";
import packageJson from "package.json";

export function healthCheckController(_req: Request, res: Response): void {
  res.sendStatus(200);
}
export function versionController(_req: Request, res: Response): void {
  res.json({
    version: packageJson.version,
  });
}
