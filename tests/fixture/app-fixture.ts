import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import { type Db, UUID } from "mongodb";
import supertest from "supertest";
import type { JsonObject } from "type-fest";
import { buildApp } from "#/app";
import { Identity } from "#/common/identity";
import { type Context, createContext } from "#/env";
import type { QueryVariable } from "#/queries/repository";
import { TestAdminUserClient } from "./test-admin-user-client";
import { TestOrganizationUserClient } from "./test-org-user-client";
import { TestRootUserClient } from "./test-root-user-client";

export interface AppFixture {
  app: Express.Application;
  ctx: Context;
  users: {
    root: TestRootUserClient;
    admin: TestAdminUserClient;
    organization: TestOrganizationUserClient;
  };
}

export async function buildFixture(): Promise<AppFixture> {
  dotenv.config({ path: ".env.test" });
  const ctx = await createContext();
  const { app } = buildApp(ctx);

  const node = {
    identity: Identity.fromSk(ctx.config.nodeSecretKey),
    endpoint: ctx.config.nodePublicEndpoint,
  };

  const users = {
    root: new TestRootUserClient({
      request: supertest(app),
      identity: Identity.fromSk(ctx.config.rootAccountSecretKey),
      node,
    }),
    admin: new TestAdminUserClient({
      request: supertest(app),
      identity: Identity.new(),
      node,
    }),
    organization: new TestOrganizationUserClient({
      request: supertest(app),
      identity: Identity.new(),
      node,
    }),
  };

  await dropDatabaseWithRetry(ctx.db.primary);
  await dropDatabaseWithRetry(ctx.db.data);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const fixture = { app, ctx, users };

  await users.root.createAccount({
    did: users.admin._options.identity.did,
    publicKey: users.admin._options.identity.pk,
    name: faker.person.fullName(),
    type: "admin",
  });

  await users.admin.createAccount({
    did: users.organization._options.identity.did,
    publicKey: users.organization._options.identity.pk,
    name: faker.person.fullName(),
    type: "organization",
  });

  return fixture;
}

async function dropDatabaseWithRetry(db: Db, maxRetries = 3, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await db.dropDatabase();
      return;
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        error.message.includes("currently being dropped") &&
        i < maxRetries - 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
}

export type SchemaFixture = {
  id: UUID;
  name: string;
  keys: string[];
  schema: JsonObject;
};

export type QueryFixture = {
  id: UUID;
  name: string;
  schema: UUID;
  variables: Record<string, QueryVariable>;
  pipeline: JsonObject[];
};

export async function registerSchemaAndQuery(
  fixture: AppFixture,
  schema: SchemaFixture,
  query: QueryFixture,
): Promise<void> {
  const { organization, admin } = fixture.users;

  {
    const response = await admin.addSchema({
      _id: new UUID(),
      owner: organization.did,
      name: schema.name,
      keys: schema.keys,
      schema: schema.schema,
    });

    if (response.body.errors) {
      console.error(response);
      throw response.body;
    }

    const id = new UUID(response.body.data);
    schema.id = id;
    query.schema = id;
  }

  {
    const response = await admin.addQuery({
      _id: new UUID(),
      owner: organization.did,
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });

    if (response.body.errors) {
      console.error(response.body.errors);
    }

    query.id = new UUID(response.body.data);
  }
}
