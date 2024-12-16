import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import { type Db, UUID } from "mongodb";
import supertest from "supertest";
import type { JsonObject } from "type-fest";
import { buildApp } from "#/app";
import { Identity } from "#/common/identity";
import { type Context, createContext } from "#/env";
import type { QueryVariable } from "#/queries/repository";
import { TestClient } from "./client";

export interface AppFixture {
  app: Express.Application;
  ctx: Context;
  users: {
    root: TestClient;
    admin: TestClient;
    organization: TestClient;
  };
}

export async function buildFixture(): Promise<AppFixture> {
  dotenv.config({ path: ".env.test" });
  const ctx = await createContext();
  const { app } = buildApp(ctx);

  const node = {
    identity: Identity.fromSk(ctx.config.nodePrivateKey),
    endpoint: ctx.config.nodePublicEndpoint,
  };

  const users = {
    root: new TestClient({
      request: supertest(app),
      identity: Identity.fromSk(ctx.config.rootAccountPrivateKey),
      node,
    }),
    admin: new TestClient({
      request: supertest(app),
      identity: Identity.new(),
      node,
    }),
    organization: new TestClient({
      request: supertest(app),
      identity: Identity.new(),
      node,
    }),
  };

  await dropDatabaseWithRetry(ctx.db.primary);
  await dropDatabaseWithRetry(ctx.db.data);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const fixture = { app, ctx, users };
  await createAccount("admin", users.admin._options.identity, users.root);
  await createAccount(
    "organization",
    users.organization._options.identity,
    users.root,
  );
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

export async function createAccount(
  type: "admin" | "organization",
  identity: Identity,
  root: TestClient,
): Promise<void> {
  await root.registerAccount({
    type,
    did: identity.did,
    publicKey: identity.publicKey,
    name: type === "admin" ? faker.person.fullName() : faker.company.name(),
  });
}

export async function registerSchemaAndQuery(
  fixture: AppFixture,
  schema: SchemaFixture,
  query: QueryFixture,
): Promise<void> {
  const { organization } = fixture.users;

  {
    const response = await organization.addSchema({
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
    const response = await organization.addQuery({
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
