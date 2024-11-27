import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { Context } from "#/env";
import query from "./data/wallet.query.json";
import schema from "./data/wallet.schema.json";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("data.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let backend: TestClient;
  let organization: OrganizationFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.context.db;
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      schema as SchemaFixture,
      query as QueryFixture,
    );
  });

  it("can upload data", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        _id: faker.string.uuid(),
        wallet: "0x1",
        country: "GBR",
        age: 20,
      },
      {
        _id: faker.string.uuid(),
        wallet: "0x2",
        country: "CAN",
        age: 30,
      },
      {
        _id: faker.string.uuid(),
        wallet: "0x3",
        country: "GBR",
        age: 40,
      },
    ];

    const response = await backend
      .uploadData({
        schema,
        data,
      })
      .expect(200);
    expect(response.body.data.created).toBe(3);

    const cursor = db.data.collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects primary key collisions", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        _id: faker.string.uuid(),
        wallet: "0x1",
        country_code: "GBR",
        age: 30,
      },
    ];

    const response = await backend.uploadData({
      schema,
      data,
    });

    expect(response.body.errors).toHaveLength(1);

    const cursor = db.data.collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects duplicates in data payload", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: "0x4",
        country_code: "GBR",
        age: 30,
      },
      {
        wallet: "0x4",
        country_code: "GBR",
        age: 30,
      },
    ];

    const _response = await backend
      .uploadData({
        schema,
        data,
      })
      .expect(200);

    const cursor = db.data.collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects data that does not conform", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: true,
        country_code: "GBR",
        age: 30,
      },
    ];

    const response = await backend
      .uploadData({
        schema,
        data,
      })
      .expect(200);

    expect(response.body.errors).toHaveLength(1);
  });

  it("can run a query", async () => {
    const { query } = organization;
    const response = await backend
      .executeQuery({
        id: query.id,
        variables: query.variables,
      })
      .expect(200);

    expect(response.body.data).toEqual([
      {
        averageAge: 30,
        count: 2,
      },
    ]);
  });
});
