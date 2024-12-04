import type { Request, RequestHandler, Response } from "express";
import type { EmptyObject } from "type-fest";
import { type AboutNode, getNodeInfo } from "./service";

export function healthCheckController(_req: Request, res: Response): void {
  res.sendStatus(200);
}

type AboutNodeControllerResponse = AboutNode;

export const aboutNodeController: RequestHandler<
  EmptyObject,
  AboutNodeControllerResponse,
  EmptyObject
> = (req: Request, res: Response): void => {
  const aboutNode = getNodeInfo(req.context);
  res.json(aboutNode);
};
