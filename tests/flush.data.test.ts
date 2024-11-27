import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
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

describe("flush.data.test", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let backend: TestClient;
  let organization: OrganizationFixture;
  const collectionSize = 100;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.context.db;
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      schema as SchemaFixture,
      query as QueryFixture,
    );

    const data = Array.from({ length: collectionSize }, () => ({
      _id: faker.string.uuid(),
      name: faker.person.fullName(),
    }));

    const response = await backend.uploadData({
      schema: organization.schema.id,
      data,
    });
  });

  it("can flush a collection", async () => {
    const schema = organization.schema.id;
    const response = await fixture.users.backend.flushData({ schema });
    const count = await db.data.collection(schema).countDocuments();

    expect(response.body.data).toBe(collectionSize);
    expect(count).toBe(0);
  });
});
