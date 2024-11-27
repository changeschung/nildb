import { Router } from "express";
import {
  createOrganizationAccessTokenController,
  createOrganizationController,
  deleteOrganizationController,
  listOrganizationController,
} from "./controllers";

export const OrganizationsEndpoint = {
  Create: "/organizations",
  Delete: "/organizations",
  List: "/organizations",
  CreateAccessToken: "/organizations/access-tokens",
} as const;

export function buildOrganizationsRouter(): Router {
  const router = Router();

  router.post(OrganizationsEndpoint.Create, createOrganizationController);
  router.post(
    OrganizationsEndpoint.CreateAccessToken,
    createOrganizationAccessTokenController,
  );
  router.get(OrganizationsEndpoint.List, listOrganizationController);
  router.delete(OrganizationsEndpoint.Delete, deleteOrganizationController);

  return router;
}
