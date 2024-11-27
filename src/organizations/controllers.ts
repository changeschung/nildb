import { Effect as E, pipe } from "effect";
import type { RequestHandler } from "express";
import type { EmptyObject } from "type-fest";
import { z } from "zod";
import { type ApiResponse, foldToApiResponse } from "#/common/handler";
import { Uuid, type UuidDto } from "#/common/types";
import {
  type JwtPayload,
  type JwtSerialized,
  createJwt,
} from "#/middleware/auth.middleware";
import {
  type OrganizationBase,
  OrganizationsRepository,
} from "./organizations.repository";

export const CreateOrganizationRequest = z.object({
  name: z.string(),
});
export type CreateOrganizationRequest = z.infer<
  typeof CreateOrganizationRequest
>;
export type CreateOrganizationResponse = ApiResponse<UuidDto>;

export const createOrganizationController: RequestHandler<
  EmptyObject,
  CreateOrganizationResponse,
  CreateOrganizationRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => CreateOrganizationRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),
    E.flatMap((request) => OrganizationsRepository.create(request)),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const CreateOrganizationAccessTokenRequest = z.object({
  id: Uuid,
});
export type CreateOrganizationAccessTokenRequest = { id: UuidDto };
export type CreateOrganizationAccessTokenResponse = ApiResponse<JwtSerialized>;

export const createOrganizationAccessTokenController: RequestHandler<
  EmptyObject,
  CreateOrganizationAccessTokenResponse,
  CreateOrganizationAccessTokenRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => CreateOrganizationAccessTokenRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap((request) => OrganizationsRepository.findById(request.id)),

    E.map((record) => {
      const payload: Partial<JwtPayload> = {
        sub: record._id,
        type: "access-token",
      };
      return createJwt(payload, req.context.config.jwtSecret);
    }),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const DeleteOrganizationRequest = z.object({
  id: Uuid,
});
export type DeleteOrganizationRequest = {
  id: UuidDto;
};
export type DeleteOrganizationResponse = ApiResponse<boolean>;

export const deleteOrganizationController: RequestHandler<
  EmptyObject,
  DeleteOrganizationResponse,
  DeleteOrganizationRequest
> = async (req, res) => {
  const response = await pipe(
    E.try({
      try: () => DeleteOrganizationRequest.parse(req.body),
      catch: (error) => error as z.ZodError,
    }),

    E.flatMap(({ id }) => OrganizationsRepository.deleteById(id)),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export type ListOrganizationsResponse = ApiResponse<OrganizationBase[]>;

export const listOrganizationController: RequestHandler<
  EmptyObject,
  ListOrganizationsResponse,
  EmptyObject
> = async (req, res) => {
  const response = await pipe(
    OrganizationsRepository.list(),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
