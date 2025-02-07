import { StatusCodes } from "http-status-codes";
import { UUID } from "mongodb";
import { describe } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { CollectionName } from "#/common/mongo";
import type { QueryDocument } from "#/queries/queries.types";
import type { SchemaDocument } from "#/schemas/schemas.repository";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import { assertDefined, expectSuccessResponse } from "./fixture/assertions";
import type { QueryFixture, SchemaFixture } from "./fixture/fixture";
import { createTestFixtureExtension } from "./fixture/it";

describe("query.test.ts", () => {
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  // don't pass in query since this suite is testing query creation
  const { it, beforeAll, afterAll } = createTestFixtureExtension({ schema });
  beforeAll(async (_ctx) => {
    query.schema = schema.id;
  });

  afterAll(async (_ctx) => {});

  it("can list queries (expect 0)", async ({ expect, organization }) => {
    const response = await organization.listQueries();

    const result = await expectSuccessResponse<QueryDocument[]>(response);
    expect(result.data).toHaveLength(0);
  });

  it("can add a query", async ({ expect, organization }) => {
    query.id = new UUID();
    const response = await organization.addQuery({
      _id: query.id,
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });

    expect(response.status).toBe(StatusCodes.CREATED);
  });

  it("can list queries (expect 1)", async ({ expect, organization }) => {
    const response = await organization.listQueries();

    const result = await expectSuccessResponse<QueryDocument[]>(response);
    expect(result.data).toHaveLength(1);
  });

  it("can delete a query", async ({ expect, bindings, organization }) => {
    const response = await organization.deleteQuery({
      id: query.id,
    });

    expect(response.status).toBe(StatusCodes.NO_CONTENT);

    const queryDocument = await bindings.db.primary
      .collection<SchemaDocument>(CollectionName.Schemas)
      .findOne({ _id: query.id });

    expect(queryDocument).toBeNull();

    const record = await bindings.db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });
    assertDefined(record);

    expect(record.queries).toHaveLength(0);
  });
});
