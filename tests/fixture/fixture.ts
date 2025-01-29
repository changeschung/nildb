import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import type { Hono } from "hono";
import { UUID } from "mongodb";
import type { JsonObject } from "type-fest";
import { buildApp } from "#/app";
import { Identity } from "#/common/identity";
import { mongoMigrateUp } from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import {
  type AppBindings,
  type AppEnv,
  EnvVarsSchema,
  loadBindings,
} from "#/env";
import type { QueryVariable } from "#/queries/queries.types";
import { expectSuccessResponse } from "./assertions";
import {
  TestAdminUserClient,
  TestOrganizationUserClient,
  TestRootUserClient,
} from "./test-client";

export type TestFixture = {
  id: string;
  app: Hono<AppEnv>;
  bindings: AppBindings;
  root: TestRootUserClient;
  admin: TestAdminUserClient;
  organization: TestOrganizationUserClient;
};

export async function buildFixture(
  opts: {
    schema?: SchemaFixture;
    query?: QueryFixture;
  } = {},
): Promise<TestFixture> {
  dotenv.config({ path: ".env.test" });
  const id = faker.string.alphanumeric(4);

  const config = EnvVarsSchema.parse({
    dbNamePrimary: `${process.env.APP_DB_NAME_PRIMARY}_${id}`,
    dbNameData: `${process.env.APP_DB_NAME_DATA}_${id}`,
    dbUri: process.env.APP_DB_URI,
    env: process.env.APP_ENV,
    logLevel: process.env.APP_LOG_LEVEL,
    nodeSecretKey: process.env.APP_NODE_SECRET_KEY,
    nodePublicEndpoint: process.env.APP_NODE_PUBLIC_ENDPOINT,
    metricsPort: Number(process.env.APP_METRICS_PORT),
    webPort: Number(process.env.APP_PORT),
  });

  const bindings = await loadBindings(config);
  await mongoMigrateUp(bindings.config.dbUri, bindings.config.dbNamePrimary);

  const { app } = buildApp(bindings);

  const node = {
    identity: Identity.fromSk(bindings.config.nodeSecretKey),
    endpoint: bindings.config.nodePublicEndpoint,
  };

  const root = new TestRootUserClient({
    app,
    identity: Identity.fromSk(bindings.config.nodeSecretKey),
    node,
  });
  const admin = new TestAdminUserClient({
    app,
    identity: Identity.new(),
    node,
  });
  const organization = new TestOrganizationUserClient({
    app,
    identity: Identity.new(),
    node,
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));

  await root.createAccount({
    did: admin._options.identity.did,
    publicKey: admin._options.identity.pk,
    name: faker.person.fullName(),
    type: "admin",
  });

  await admin.createAccount({
    did: organization._options.identity.did,
    publicKey: organization._options.identity.pk,
    name: faker.person.fullName(),
    type: "organization",
  });

  if (opts.schema) {
    await registerSchemaAndQuery({
      organization,
      schema: opts.schema,
      query: opts.query,
    });
  }

  return { id, app, bindings, root, admin, organization };
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

export async function registerSchemaAndQuery(opts: {
  organization: TestOrganizationUserClient;
  schema: SchemaFixture;
  query?: QueryFixture;
}): Promise<void> {
  const { organization, schema, query } = opts;

  const response = await organization.addSchema({
    _id: new UUID(),
    name: schema.name,
    keys: schema.keys,
    schema: schema.schema,
  });

  const body = await expectSuccessResponse<UuidDto>(response);
  const id = new UUID(body.data);
  schema.id = id;

  if (query) {
    query.schema = id;
    const response = await organization.addQuery({
      _id: new UUID(),
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });

    const body = await expectSuccessResponse<UuidDto>(response);
    query.id = new UUID(body.data);
  }
}
