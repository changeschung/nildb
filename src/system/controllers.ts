import type { Request, RequestHandler, Response } from "express";
import type { EmptyObject } from "type-fest";
import { type AboutNode, SystemService } from "./service";
type AboutNodeControllerResponse = AboutNode;

export const aboutNodeController: RequestHandler<
  EmptyObject,
  AboutNodeControllerResponse,
  EmptyObject
> = (req: Request, res: Response): void => {
  const aboutNode = SystemService.getNodeInfo(req.ctx);
  res.json(aboutNode);
};

export function healthCheckController(_req: Request, res: Response): void {
  res.sendStatus(200);
}

export const SystemController = {
  aboutNodeController,
  healthCheckController,
};
