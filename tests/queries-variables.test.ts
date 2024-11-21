import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { UuidDto } from "#/types";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildAppFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import {
  assertDefined,
  assertFailureResponse,
  assertSuccessResponse,
} from "./fixture/assertions";

describe("queries > variable injection", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "test-schema",
    keys: [],
    definition: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      items: {
        type: "object",
        properties: {
          wallet: { type: "string" },
          amount: { type: "number" },
          status: { type: "string" },
          timestamp: { type: "string" },
        },
        required: ["wallet", "amount", "status", "timestamp"],
      },
    },
  };

  const query: QueryFixture = {
    id: "" as UuidDto,
    name: "test-query-with-variables",
    schema: "" as UuidDto,
    variables: {
      minAmount: { type: "number", description: "Minimum amount filter" },
      status: { type: "string", description: "Status to filter by" },
      startDate: { type: "string", description: "Start date filter" },
    },
    pipeline: [
      {
        $match: {
          amount: { $gte: "##minAmount" },
          status: "##status",
          timestamp: { $gte: "##startDate" },
        },
      },
      {
        $group: {
          _id: "$status",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $sort: {
          totalAmount: -1,
        },
      },
    ],
  };

  let organization: OrganizationFixture;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("can setup organization and records", async () => {
    organization = await setupOrganization(fixture, schema, query);
    const schemaId = organization.schema.id;

    // generate some test data
    const data = Array.from({ length: 10 }, () => ({
      wallet: faker.finance.ethereumAddress(),
      amount: faker.number.int({ min: 100, max: 1000 }),
      status: faker.helpers.arrayElement(["pending", "completed", "failed"]),
      timestamp: faker.date.recent().toISOString(),
    }));

    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data,
    });
    assertSuccessResponse(response);
  });

  it("can execute query with variables", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertSuccessResponse(response);

    const results = response.data as unknown as {
      _id: string;
      totalAmount: number;
      count: number;
    }[];
    assertDefined(results);

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

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertFailureResponse(response);
    expect(response.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects object as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: { value: "completed" },
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    };

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertFailureResponse(response);
    expect(response.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects when providing null as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: null,
    };

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertFailureResponse(response);
    expect(response.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("reject undefined as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: undefined,
    };

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertFailureResponse(response);
    expect(response.errors[0]).toMatch(/An unknown error occurred/);
  });

  it("rejects function as variable value", async () => {
    const id = organization.query.id;
    const variables = {
      minAmount: 500,
      status: "completed",
      startDate: () => new Date().toISOString(),
    };

    const response = await fixture.users.backend.executeQuery({
      id,
      variables,
    });
    assertFailureResponse(response);
    expect(response.errors[0]).toMatch(/An unknown error occurred/);
  });
});
