import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { Context } from "#/env";
import query from "./data/datetime.query.json";
import schema from "./data/datetime.schema.json";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("schemas.datetime.test", async () => {
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

  it("can upload date-times", async () => {
    const schema = organization.schema.id;

    const data = [
      { _id: faker.string.uuid(), datetime: "2024-03-19T14:30:00Z" },
      { _id: faker.string.uuid(), datetime: "2024-03-19T14:30:00.123Z" },
      { _id: faker.string.uuid(), datetime: "2024-03-19T14:30:00+01:00" },
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

  it("rejects invalid date-times", async () => {
    const schema = organization.schema.id;
    const data = [
      { datetime: "2024-03-19" }, // missing time
      { datetime: "14:30:00" }, // missing date
      { datetime: "2024-13-19T14:30:00Z" }, // invalid month
      { datetime: "not a date" }, // completely invalid
      { datetime: 12345 }, // wrong type
    ];

    for (const invalid of data) {
      const response = await backend
        .uploadData({
          schema,
          data: [invalid],
        })
        .expect(200);
      expect(response.body.errors).toBeTruthy();
    }
  });

  it("can run query with datetime data", async () => {
    const response = await backend
      .executeQuery({
        id: organization.query.id,
        variables: organization.query.variables,
      })
      .expect(200);

    expect(response.body.data).toEqual([
      {
        datetime: "2024-03-19T14:30:00Z",
      },
    ]);
  });
});
