import { faker } from "@faker-js/faker";
import { Effect as E, pipe } from "effect";
import type { Hono } from "hono";
import { MongoClient } from "mongodb";
import type { Mongoose } from "mongoose";
import { connect as createMongoose } from "mongoose";
import pino from "pino";
import pretty from "pino-pretty";
import { type AppEnv, type Bindings, type Variables, buildApp } from "#/app";
import { createUserRecord } from "#/models/users";
import { TestClient } from "./client";

export interface AppFixture {
  app: Hono<AppEnv>;
  clients: {
    db: MongoClient;
    mongoose: Mongoose;
  };
  users: {
    root: TestClient;
    admin: TestClient;
    backend: TestClient;
  };
}

export async function buildAppFixture(): Promise<AppFixture> {
  const log = pino(pretty());
  const dbUri = "mongodb://localhost:27017/test";

  const clients = {
    db: await MongoClient.connect(dbUri),
    mongoose: await createMongoose(dbUri),
  };

  const bindings: Bindings = {
    name: "test",
    webPort: 9090,
    dbUri,
    jwtSecret: "0xdeadbeef",
    logLevel: "debug",
  };

  const context: Variables = {
    db: {
      mongo: clients.db,
      mongoose: clients.mongoose,
    },
    log,
  };
  const app = buildApp(bindings, context);

  const users = {
    root: new TestClient({
      app,
      email: "root@datablocks.com",
      password: "datablocks-root-password",
      type: "root",
      jwt: "",
    }),
    admin: new TestClient({
      app,
      email: faker.internet.email().toLowerCase(),
      password: faker.internet.password(),
      type: "admin",
      jwt: "",
    }),
    backend: new TestClient({
      app,
      email: "backend@fe.com",
      password: "",
      type: "backend",
      jwt: "",
    }),
  };

  log.info("test fixture: dropping database");
  await clients.db.db().dropDatabase();

  log.info("test fixture: create root user");
  try {
    await pipe(
      createUserRecord({
        email: users.root._options.email,
        password: users.root._options.password,
        // @ts-expect-error: root user is an exception
        type: users.root._options.type,
      }),
      E.runPromise,
    );
  } catch (e) {
    console.error(e);
  }

  log.info("test fixture: logging root user in");

  const { token } = await users.root.login();
  users.root.jwt = token;

  return { app, clients, users };
}
