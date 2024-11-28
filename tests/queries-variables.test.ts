import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import query from "./data/variables.wallet.query.json";
import schema from "./data/variables.wallet.schema.json";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("queries.variables.test.ts", () => {
  let fixture: AppFixture;
  let backend: TestClient;
  let organization: OrganizationFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      schema as SchemaFixture,
      query as unknown as QueryFixture,
    );
  });

  it("creates records", async () => {
    const schemaId = organization.schema.id;

    // generate test data
    const data = Array.from({ length: 10 }, () => ({
      _id: faker.string.uuid(),
      wallet: faker.finance.ethereumAddress(),
      amount: faker.number.int({ min: 100, max: 1000 }),
      status: faker.helpers.arrayElement(["pending", "completed", "failed"]),
      timestamp: faker.date.recent().toISOString(),
    }));

    const _response = await backend
      .uploadData({
        schema: schemaId,
        data,
      })
      .expect(200);
  });

  it("can execute query with variables", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
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

    expect(results.length).toBeGreaterThan(0);

    for (const result of results) {
      expect(result._id).toBe("completed");
      expect(result.totalAmount).toBeGreaterThanOrEqual(500 * result.count);
      expect(result.count).toBeGreaterThan(0);
    }
  });

  it("rejects array as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: [500, 600],
      status: "completed",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);
    expect(response.body.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects object as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: { value: "completed" },
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);
    expect(response.body.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects when providing null as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: null,
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);
    expect(response.body.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("reject undefined as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: undefined,
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);
    expect(response.body.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects function as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: () => new Date().toISOString(),
    };

    const response = await backend
      .executeQuery({
        id,
        variables,
      })
      .expect(200);
    expect(response.body.errors[0]).toMatch(/An unknown error occurred/);
  });
});
