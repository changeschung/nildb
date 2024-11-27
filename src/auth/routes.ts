import { Router } from "express";
import { loginController } from "./controllers";

export const AuthEndpoints = {
  Login: "/auth/login",
} as const;

export function buildAuthRouter(): Router {
  const router = Router();

  router.post(AuthEndpoints.Login, loginController);

  return router;
}
