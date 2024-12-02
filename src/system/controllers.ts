import type { Request, RequestHandler, Response } from "express";
import packageJson from "package.json";
import type { EmptyObject } from "type-fest";

export function healthCheckController(_req: Request, res: Response): void {
  res.sendStatus(200);
}

type AboutNodeControllerResponse = {
  started: Date;
  version: string;
  address: string;
  publicKey: string;
  endpoint: string;
};

const started = new Date();

export const aboutNodeController: RequestHandler<
  EmptyObject,
  AboutNodeControllerResponse,
  EmptyObject
> = (req: Request, res: Response): void => {
  res.json({
    version: packageJson.version,
    started,
    address: req.context.node.address,
    publicKey: req.context.node.publicKey,
    endpoint: req.context.node.endpoint,
    peers: [],
  });
};
