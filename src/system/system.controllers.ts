import type { Request, RequestHandler, Response } from "express";
import { StatusCodes } from "http-status-codes";
import type { EmptyObject } from "type-fest";
import type { AboutNode } from "./system.services";
import * as SystemService from "./system.services";

type AboutNodeControllerResponse = AboutNode;

export const aboutNodeController: RequestHandler<
  EmptyObject,
  AboutNodeControllerResponse,
  EmptyObject
> = (req: Request, res: Response): void => {
  const { ctx } = req;
  const aboutNode = SystemService.getNodeInfo(ctx);
  res.json(aboutNode);
};

export function healthCheckController(_req: Request, res: Response): void {
  res.sendStatus(StatusCodes.OK);
}
