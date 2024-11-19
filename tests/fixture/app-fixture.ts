import { faker } from "@faker-js/faker";
import dotenv from "dotenv";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { MongoClient } from "mongodb";
import { connect as createMongoose } from "mongoose";
import pino from "pino";
import pretty from "pino-pretty";
import { type AppEnv, type Variables, buildApp } from "#/app";
import { loadEnv } from "#/env";
import { createLogger } from "#/logging";
import { UsersRepository } from "#/models";
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
      jwt: "",
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

  Log.info("test fixture: create root user");
  try {
    await pipe(
      UsersRepository.create({
        email: users.root._options.email,
        password: users.root._options.password,
        type: "root",
      }),
      E.runPromise,
    );
  } catch (e) {
    console.error(e);
  }

  Log.info("test fixture: logging root user in");

  const response = await users.root.login();
  assertSuccessResponse(response);
  users.root.jwt = response.data;

  return { app, clients, users };
}
