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
import { TAIL_DATA_LIMIT } from "#/data/repository";

describe("tail.data.test", () => {
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

    const _response = await backend.uploadData({
      schema: organization.schema.id,
      data,
    });
  });

  it("can tail a collection", async () => {
    const schema = organization.schema.id;
    const response = await fixture.users.backend.tailData({ schema });

    expect(response.body.data).toHaveLength(TAIL_DATA_LIMIT);
  });
});
