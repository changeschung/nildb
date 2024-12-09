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
} from "#/middleware/auth";
import {
  type OrganizationDocument,
  organizationsDeleteOne,
  organizationsFindMany,
  organizationsFindOne,
  organizationsInsert,
} from "./repository";

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
    E.flatMap((request) =>
      organizationsInsert(req.context.db.primary, request),
    ),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export const CreateOrganizationAccessTokenRequest = z.object({
  id: Uuid,
});
export type CreateOrganizationAccessTokenRequest = z.infer<
  typeof CreateOrganizationAccessTokenRequest
>;
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

    E.flatMap((request) => {
      return organizationsFindOne(req.context.db.primary, {
        _id: request.id,
      });
    }),

    E.map((record) => {
      const payload: Partial<JwtPayload> = {
        sub: record._id.toString() as UuidDto,
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
export type DeleteOrganizationRequest = z.infer<
  typeof DeleteOrganizationRequest
>;
export type DeleteOrganizationResponse = ApiResponse<UuidDto>;

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

    E.flatMap(({ id }) =>
      organizationsDeleteOne(req.context.db.primary, { _id: id }),
    ),

    E.map((id) => id.toString() as UuidDto),

    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};

export type ListOrganizationsResponse = ApiResponse<OrganizationDocument[]>;

export const listOrganizationController: RequestHandler<
  EmptyObject,
  ListOrganizationsResponse,
  EmptyObject
> = async (req, res) => {
  const response = await pipe(
    organizationsFindMany(req.context.db.primary, {}),
    foldToApiResponse(req.context),
    E.runPromise,
  );

  res.send(response);
};
