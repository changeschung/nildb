import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import type { Hono } from "hono";
import { MongoClient } from "mongodb";
import { connect as createMongoose } from "mongoose";
import type { JsonObject } from "type-fest";
import { type AppEnv, type Variables, buildApp } from "#/app";
import { loadEnv } from "#/env";
import { createJwt } from "#/handlers/auth-middleware";
import { createLogger } from "#/logging";
import { Uuid, type UuidDto } from "#/types";
import { assertSuccessResponse } from "./assertions";
import { TestClient } from "./client";

export interface AppFixture {
  app: Hono<AppEnv>;
  clients: {
    primary: MongoClient;
    data: MongoClient;
  };
  users: {
    root: TestClient;
    admin: TestClient;
    backend: TestClient;
  };
}

export async function buildAppFixture(): Promise<AppFixture> {
  dotenv.config({ path: ".env.test" });

  const Log = createLogger().child({ module: "test" });
  Log.info("Building app test fixture");

  const bindings = loadEnv();

  const primaryDbUri = `${bindings.dbUri}/${bindings.dbNamePrefix}`;
  const dataDbUri = `${bindings.dbUri}/${bindings.dbNamePrefix}_data`;

  await createMongoose(primaryDbUri, { bufferCommands: false });
  const primary = await MongoClient.connect(primaryDbUri);
  const data = await MongoClient.connect(dataDbUri);

  const clients = {
    primary,
    data,
  };

  const variables: Variables = {
    db: {
      primary: clients.primary,
      data: clients.data,
    },
    Log,
  };
  const app = buildApp(bindings, variables);

  const users = {
    root: new TestClient({
      app,
      email: "root@datablocks.com",
      password: "datablocks-root-password",
      jwt: await createJwt(
        {
          sub: Uuid.parse("00000000-0000-0000-0000-000000000000"),
          iat: Math.round(Date.now() / 1000),
          type: "root",
        },
        bindings.jwtSecret,
      ),
    }),
    admin: new TestClient({
      app,
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password(),
      jwt: "",
    }),
    backend: new TestClient({
      app,
      email: "backend@fe.com",
      password: "",
      jwt: "",
    }),
  };

  Log.info(`Dropping database: ${primaryDbUri}`);
  await clients.primary.db().dropDatabase();
  Log.info(`Dropping database: ${dataDbUri}`);
  await clients.data.db().dropDatabase();

  return { app, clients, users };
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
  definition: JsonObject;
};

export type QueryFixture = {
  id: UuidDto;
  name: string;
  schema: UuidDto;
  variables: JsonObject;
  pipeline: Record<string, unknown>[];
};

export async function setupOrganization(
  fixture: AppFixture,
  schema: SchemaFixture,
  query: QueryFixture,
): Promise<OrganizationFixture> {
  const organization: Partial<OrganizationFixture> = {};
  const { root, backend } = fixture.users;

  {
    const response = await root.createOrganization({
      name: faker.company.name(),
    });
    assertSuccessResponse(response);
    organization.id = response.data;
  }

  {
    const response = await root.createOrganizationAccessToken({
      id: organization.id,
    });
    assertSuccessResponse(response);
    backend.jwt = response.data;
  }

  {
    const response = await backend.addSchema({
      org: organization.id,
      name: schema.name,
      keys: schema.keys,
      schema: schema.definition,
    });
    assertSuccessResponse(response);
    schema.id = response.data;
    query.schema = response.data;
  }

  {
    const response = await backend.addQuery({
      org: organization.id,
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });
    assertSuccessResponse(response);
    query.id = response.data;
  }

  organization.schema = schema;
  organization.query = query;
  return organization as OrganizationFixture;
}
