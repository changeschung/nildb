import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
import type { DataDocument, UploadResult } from "#/data/repository";
import type { Context } from "#/env";
import queryJson from "./data/wallet.query.json";
import schemaJson from "./data/wallet.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("data.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let organization: TestClient;

  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.ctx.db;
    organization = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);
  });

  it("can upload data", async () => {
    const data = [
      {
        _id: createUuidDto(),
        wallet: "0x1",
        country: "GBR",
        age: 20,
      },
      {
        _id: createUuidDto(),
        wallet: "0x2",
        country: "CAN",
        age: 30,
      },
      {
        _id: createUuidDto(),
        wallet: "0x3",
        country: "GBR",
        age: 40,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    expect(response.body.data.created).toHaveLength(3);

    const cursor = db.data.collection(schema.id.toString()).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects primary key collisions", async () => {
    const data = [
      {
        _id: createUuidDto(),
        wallet: "0x1",
        country: "GBR",
        age: 30,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });
    const result = response.body.data as UploadResult;
    expect(result.errors).toHaveLength(1);

    const cursor = db.data.collection(schema.id.toString()).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("allows for partial success", async () => {
    const data = [
      {
        _id: createUuidDto(),
        wallet: "0x1", // collides expect failure
        country: "GBR",
        age: 30,
      },
      {
        _id: createUuidDto(),
        wallet: "0x4", // unique expect success
        country: "GBR",
        age: 30,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const result = response.body.data as UploadResult;
    expect(result.errors).toHaveLength(1);
    expect(result.created).toHaveLength(1);
  });

  it("rejects duplicates in data payload", async () => {
    const data = [
      {
        _id: createUuidDto(),
        wallet: "0x4",
        country: "GBR",
        age: 30,
      },
      {
        _id: createUuidDto(),
        wallet: "0x4",
        country: "GBR",
        age: 30,
      },
    ];

    const _response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const cursor = db.data.collection(schema.id.toString()).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(4);
  });

  it("rejects data that does not conform", async () => {
    const data = [
      {
        _id: createUuidDto(),
        wallet: true, // should be string
        country: "GBR",
        age: 30,
      },
    ];

    const response = await organization.uploadData(
      {
        schema: schema.id,
        data,
      },
      false,
    );

    expect(response.body.errors).toContain("Schema validation failed");
  });

  it("can run a query", async () => {
    const response = await organization.executeQuery({
      id: query.id,
      variables: query.variables,
    });

    expect(response.body.data).toEqual([
      {
        averageAge: 30,
        count: 3,
      },
    ]);
  });

  it("can read data by a single id", async () => {
    const expected = await db.data
      .collection<DataDocument>(schema.id.toString())
      .findOne({});

    assertDefined(expected);
    const _id = expected._id.toString();

    const response = await organization.readData({
      schema: schema.id,
      filter: { _id },
    });

    const actual = response.body.data[0];
    expect(actual._id).toBe(_id);
  });

  it("can read data from a list of ids", async () => {
    const expected = await db.data
      .collection<DataDocument>(schema.id.toString())
      .find({})
      .limit(3)
      .toArray();

    assertDefined(expected);
    const ids = expected.map((document) => document._id.toString());

    const response = await organization.readData({
      schema: schema.id,
      filter: { _id: { $in: ids } },
    });

    const actual = response.body.data;
    expect(actual).toHaveLength(3);
  });
});
