import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
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
import type { TestClient } from "./fixture/client";

describe("Schemas delete by filter", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let organization: TestClient;
  const collectionSize = 100;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.ctx.db;
    organization = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);

    const data = Array.from({ length: collectionSize - 3 }, () => ({
      _id: createUuidDto(),
      name: faker.person.fullName(),
    }));

    data.push({ _id: createUuidDto(), name: "foo" });
    data.push({ _id: createUuidDto(), name: "bar" });
    data.push({ _id: createUuidDto(), name: "bar" });

    const shuffledData = [...data].sort(() => Math.random() - 0.5);

    const _response = await organization.uploadData({
      schema: schema.id,
      data: shuffledData,
    });
  });

  it("rejects empty filter", async () => {
    const filter = {};

    const response = await organization.deleteData(
      {
        schema: schema.id,
        filter,
      },
      false,
    );

    expect(response.body.errors).toContain(
      "key=filter, reason=Filter cannot be empty",
    );
  });

  it("can remove a single match", async () => {
    const filter = { name: "foo" };

    const response = await organization.deleteData({
      schema: schema.id,
      filter,
    });
    const count = await db.data
      .collection(schema.id.toString())
      .countDocuments();

    expect(response.body.data).toBe(1);
    expect(count).toBe(collectionSize - 1);
  });

  it("can remove multiple matches", async () => {
    const filter = { name: "bar" };

    const response = await organization.deleteData({
      schema: schema.id,
      filter,
    });
    const count = await db.data
      .collection(schema.id.toString())
      .countDocuments();

    expect(response.body.data).toBe(2);
    expect(count).toBe(collectionSize - 3);
  });
});
