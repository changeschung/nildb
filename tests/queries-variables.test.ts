import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
import queryJson from "./data/variables.wallet.query.json";
import schemaJson from "./data/variables.wallet.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("queries.variables.test.ts", () => {
  let fixture: AppFixture;
  let backend: TestClient;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    backend = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);
  });

  it("creates records", async () => {
    // generate test data
    const data = Array.from({ length: 10 }, () => ({
      _id: createUuidDto(),
      wallet: faker.finance.ethereumAddress(),
      amount: faker.number.int({ min: 100, max: 1000 }),
      status: faker.helpers.arrayElement(["pending", "completed", "failed"]),
      timestamp: faker.date.recent().toISOString(),
    }));

    const _response = await backend.uploadData({
      schema: schema.id,
      data,
    });
  });

  it("can execute query with variables", async () => {
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await backend.executeQuery({
      id: query.id,
      variables,
    });

    const results = response.body.data as unknown as {
      _id: string;
      totalAmount: number;
      count: number;
    }[];

    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result._id).toBe("completed");
      expect(result.totalAmount).toBeGreaterThanOrEqual(500 * result.count);
      expect(result.count).toBeGreaterThan(0);
    }
  });

  it("rejects object as variable value", async () => {
    const variables = {
      minAmount: 500,
      status: { value: "completed" },
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await backend.executeQuery({
      id: query.id,
      variables,
    });

    expect(response.body.errors).toHaveLength(1);
    const stringifiedErrors = JSON.stringify(response.body.errors);
    expect(stringifiedErrors).toMatch("status");
    expect(stringifiedErrors).toMatch("Expected string");
  });

  it("rejects when providing null as variable value", async () => {
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: null,
    };

    const response = await backend.executeQuery({
      id: query.id,
      variables,
    });

    expect(response.body.errors).toHaveLength(1);
    const stringifiedErrors = JSON.stringify(response.body.errors);
    expect(stringifiedErrors).toMatch("startDate");
    expect(stringifiedErrors).toMatch("Required");
  });

  it("reject undefined as variable value", async () => {
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: undefined,
    };

    const response = await backend.executeQuery({
      id: query.id,
      variables,
    });

    expect(response.body.errors).toHaveLength(1);
    const stringifiedErrors = JSON.stringify(response.body.errors);
    expect(stringifiedErrors).toMatch("An unknown error occurred");
    // expect(stringifiedErrors).toMatch("startDate");
  });

  it("rejects function as variable value", async () => {
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: () => new Date().toISOString(),
    };

    const response = await backend.executeQuery({
      id: query.id,
      variables,
    });

    const stringifiedErrors = JSON.stringify(response.body.errors);
    expect(stringifiedErrors).toMatch("An unknown error occurred");
    // expect(response.body.errors[0]).toMatch(
    //   /Invalid query execution variables/,
    // );
  });
});
