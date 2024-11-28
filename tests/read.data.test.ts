import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { UuidDto } from "#/common/types";
import { TAIL_DATA_LIMIT } from "#/data/repository";
import type { Context } from "#/env";
import query from "./data/simple.query.json";
import schema from "./data/simple.schema.json";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("read.data.test", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let backend: TestClient;
  let organization: OrganizationFixture;

  const collectionSize = 100;
  const data = Array.from({ length: collectionSize }, () => ({
    _id: faker.string.uuid(),
    name: faker.person.fullName(),
  }));

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.context.db;
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      schema as SchemaFixture,
      query as unknown as QueryFixture,
    );

    const _response = await backend.uploadData({
      schema: organization.schema.id,
      data,
    });
  });

  it("can tail a collection", async () => {
    const schema = organization.schema.id;
    const response = await backend.tailData({ schema });

    expect(response.body.data).toHaveLength(TAIL_DATA_LIMIT);
  });

  it("can read data from a collection", async () => {
    const schema = organization.schema.id;
    const record = data[Math.floor(Math.random() * collectionSize)];

    const filter = { name: record.name };
    const response = await backend.readData({ schema, filter });
    const result = response.body.data as { _id: UuidDto; name: string }[];

    expect(result).toHaveLength(1);
    expect(result[0]?._id).toBe(record._id);
    expect(result[0]?.name).toBe(record.name);
  });
});
