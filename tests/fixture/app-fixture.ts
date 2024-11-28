import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import type { Db } from "mongodb";
import supertest from "supertest";
import type { JsonArray, JsonObject } from "type-fest";
import { buildApp } from "#/app";
import { Uuid, type UuidDto } from "#/common/types";
import { type Context, createContext } from "#/env";
import { createJwt } from "#/middleware/auth";
import type { QueryVariable } from "#/queries/repository";
import { TestClient } from "./client";

export interface AppFixture {
  app: Express.Application;
  context: Context;
  users: {
    root: TestClient;
    admin: TestClient;
    backend: TestClient;
  };
}

export async function buildFixture(): Promise<AppFixture> {
  dotenv.config({ path: ".env.test" });
  const context = await createContext();
  const app = buildApp(context);

  const users = {
    root: new TestClient({
      request: supertest(app),
      email: "root@datablocks.com",
      password: "datablocks-root-password",
      jwt: createJwt(
        {
          sub: "00000000-0000-0000-0000-000000000000",
          iat: Math.round(Date.now() / 1000),
          type: "root",
        },
        context.config.jwtSecret,
      ),
    }),
    admin: new TestClient({
      request: supertest(app),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password(),
      jwt: "",
    }),
    backend: new TestClient({
      request: supertest(app),
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password(),
      jwt: "",
    }),
  };

  await dropDatabaseWithRetry(context.db.primary);
  await dropDatabaseWithRetry(context.db.data);
  await new Promise((resolve) => setTimeout(resolve, 1000));

  return { app, context, users };
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

export type OrganizationFixture = {
  id: UuidDto;
  name: string;
  schema: SchemaFixture;
  query: QueryFixture;
};

export type SchemaFixture = {
  id: UuidDto;
  name: string;
  keys: string[];
  schema: JsonObject;
};

export type QueryFixture = {
  id: UuidDto;
  name: string;
  schema: UuidDto;
  variables: Record<string, QueryVariable>;
  pipeline: JsonObject[];
};

export async function setupAdmin(fixture: AppFixture): Promise<void> {
  const { root, admin } = fixture.users;
  await root.createUser({
    email: admin.email,
    password: admin.password,
    type: "admin",
  });

  const response = await admin.login({
    email: admin.email,
    password: admin.password,
  });
  admin.jwt = response.body.data;
}

export async function setupOrganization(
  fixture: AppFixture,
  schema: SchemaFixture,
  query: QueryFixture,
): Promise<OrganizationFixture> {
  const organization: Partial<OrganizationFixture> = {};
  const { admin, backend } = fixture.users;

  await setupAdmin(fixture);

  {
    const response = await admin
      .createOrganization({
        name: faker.company.name(),
      })
      .expect(200);

    if (response.body.errors) {
      console.log(response.body.errors);
    }

    organization.id = response.body.data;
  }

  {
    const response = await admin
      .createOrganizationAccessToken({
        id: organization.id!,
      })
      .expect(200);

    if (response.body.errors) {
      console.log(response.body.errors);
    }

    backend.jwt = response.body.data;
  }

  {
    const response = await backend
      .addSchema({
        org: organization.id!,
        name: schema.name,
        keys: schema.keys,
        schema: schema.schema,
      })
      .expect(200);

    if (response.body.errors) {
      console.log(response.body.errors);
    }

    const id = response.body.data as UuidDto;
    schema.id = id;
    query.schema = id;
  }

  {
    const response = await backend
      .addQuery({
        org: organization.id!,
        name: query.name,
        schema: query.schema,
        variables: query.variables,
        pipeline: query.pipeline,
      })
      .expect(200);

    if (response.body.errors) {
      console.error(response.body.errors);
    }

    query.id = response.body.data as UuidDto;
  }

  organization.schema = schema;
  organization.query = query;

  if (!organization.schema.id) {
    console.error("Test schema setup failed");
    throw new Error("Test query setup failed");
  }

  if (!organization.query.id) {
    console.error("Test query setup failed");
    throw new Error("Test query setup failed");
  }

  return organization as OrganizationFixture;
}
