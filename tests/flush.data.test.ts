import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
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

describe("flush.data.test", () => {
  let fixture: AppFixture;
  let organization: TestClient;
  const collectionSize = 100;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    organization = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);

    const data = Array.from({ length: collectionSize }, () => ({
      _id: createUuidDto(),
      name: faker.person.fullName(),
    }));

    const _response = await organization.uploadData({
      schema: schema.id,
      data,
    });
  });

  it("can flush a collection", async () => {
    const schemaId = schema.id;
    const response = await fixture.users.organization.flushData({
      schema: schemaId,
    });
    const count = await fixture.ctx.db.data
      .collection(schemaId.toString())
      .countDocuments();

    expect(response.body.data).toBe(collectionSize);
    expect(count).toBe(0);
  });
});
