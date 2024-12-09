import { faker } from "@faker-js/faker";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
import query from "./data/variables.array.query.json";
import schema from "./data/variables.array.schema.json";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("queries.array.variables.test.ts", () => {
  let fixture: AppFixture;
  let backend: TestClient;
  let organization: OrganizationFixture;

  // generate test data
  const data = Array.from({ length: 10 }, () => ({
    _id: createUuidDto(),
    values: [faker.number.int(), faker.number.int(), faker.number.int()],
  }));

  beforeAll(async () => {
    fixture = await buildFixture();
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      { ...schema, id: new UUID() } as SchemaFixture,
      { ...query, id: new UUID() } as unknown as QueryFixture,
    );
  });

  it("creates records", async () => {
    const schemaId = organization.schema.id;
    const _response = await backend
      .uploadData({
        schema: schemaId,
        data,
      })
      .expect(200);
  });

  it("rejects mixed-type arrays", async () => {
    const id = organization.query.id;
    const variables = {
      values: [1, "string"],
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);

    expect(response.body.errors).toHaveLength(1);
  });

  it("can execute with empty array", async () => {
    const id = organization.query.id;
    const variables = {
      values: [],
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);

    const results = response.body.data as unknown as {
      _id: string;
      totalAmount: number;
      count: number;
    }[];

    expect(results.length).toBe(0);
  });

  it("can use valid array of variables in pipeline", async () => {
    const actual = data[2];
    const id = organization.query.id;
    const variables = {
      values: actual.values,
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);

    const results = response.body.data as unknown as {
      _id: string;
      values: number[];
    }[];

    expect(results.length).toBe(1);
  });
});
