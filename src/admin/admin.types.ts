import { z } from "zod";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { NilDid } from "#/common/nil-did";
import { PUBLIC_KEY_LENGTH } from "#/env";
import { AddQueryRequestSchema } from "#/queries/queries.types";
import { AddSchemaRequestSchema } from "#/schemas/schemas.types";

/**
 * Controllers types
 */
export const AdminCreateAccountRequestSchema = z.object({
  did: NilDid,
  publicKey: z.string().length(PUBLIC_KEY_LENGTH),
  name: z.string(),
  type: z.enum(["admin", "organization"]),
});
export type AdminCreateAccountRequest = z.infer<
  typeof AdminCreateAccountRequestSchema
>;

export const AdminDeleteAccountRequestSchema = z.object({
  id: NilDid,
});
export type AdminDeleteAccountRequest = z.infer<
  typeof AdminDeleteAccountRequestSchema
>;

export const AdminSetSubscriptionStateRequestSchema = z.object({
  ids: z.array(NilDid).nonempty(),
  active: z.boolean(),
});
export type AdminSetSubscriptionStateRequest = z.infer<
  typeof AdminSetSubscriptionStateRequestSchema
>;

export const AdminAddQueryRequestSchema = AddQueryRequestSchema.extend({
  owner: NilDid,
});
export type AdminAddQueryRequest = z.infer<typeof AdminAddQueryRequestSchema>;

export const AdminAddSchemaRequestSchema = AddSchemaRequestSchema.extend({
  owner: NilDid,
});
export type AdminAddSchemaRequest = z.infer<typeof AdminAddSchemaRequestSchema>;

/**
 * Repository types
 */
export type AccountDocument =
  | RootAccountDocument
  | AdminAccountDocument
  | OrganizationAccountDocument;

export type AccountType = "root" | "admin" | "organization";

export type RootAccountDocument = {
  _id: NilDid;
  _type: "root";
  publicKey: string;
};

export type AdminAccountDocument = {
  _id: NilDid;
  _type: "admin";
  _created: Date;
  _updated: Date;
  publicKey: string;
  name: string;
};
