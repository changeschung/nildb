import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import { type UuidDto, createUuidDto } from "#/common/types";
import type { DataDocument } from "#/data/repository";
import type { Context } from "#/env";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("update.data.test", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let backend: TestClient;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  const collectionSize = 100;
  const data = Array.from({ length: collectionSize }, () => ({
    _id: createUuidDto(),
    name: faker.person.fullName(),
  }));

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.ctx.db;
    backend = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);
    const _response = await backend.uploadData({
      schema: schema.id,
      data,
    });
  });

  it("can update data in a collection", async () => {
    const record = data[Math.floor(Math.random() * collectionSize)];

    const filter = { name: record.name };
    const update = { $set: { name: "foo" } };
    const response = await backend.updateData({
      schema: schema.id,
      filter,
      update,
    });
    const result = response.body.data as { _id: UuidDto; name: string }[];

    expect(result).toEqual({
      matched: 1,
      updated: 1,
    });

    const actual = await db.data
      .collection<DataDocument>(schema.id.toString())
      .findOne({ name: "foo" });

    assertDefined(actual);

    expect(actual._id.toString()).toBe(record._id);
  });
});
