import { Router } from "express";
import { createUserController, deleteUserController } from "./controllers";

export const UsersEndpoint = {
  Create: "/users",
  Delete: "/users",
} as const;

export function buildUsersRouter(): Router {
  const router = Router();

  router.post(UsersEndpoint.Create, createUserController);
  router.delete(UsersEndpoint.Delete, deleteUserController);

  return router;
}
