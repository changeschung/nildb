import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import { type UuidDto, createUuidDto } from "#/common/types";
import { TAIL_DATA_LIMIT } from "#/data/repository";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("read.data.test", () => {
  let fixture: AppFixture;
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
    backend = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);

    const _response = await backend.uploadData({
      schema: schema.id,
      data,
    });
  });

  it("can tail a collection", async () => {
    const response = await backend.tailData({ schema: schema.id });

    expect(response.body.data).toHaveLength(TAIL_DATA_LIMIT);
  });

  it("can read data from a collection", async () => {
    const record = data[Math.floor(Math.random() * collectionSize)];

    const filter = { name: record.name };
    const response = await backend.readData({ schema: schema.id, filter });
    const result = response.body.data as { _id: UuidDto; name: string }[];

    expect(result).toHaveLength(1);
    expect(result[0]?._id).toBe(record._id);
    expect(result[0]?.name).toBe(record.name);
  });
});
