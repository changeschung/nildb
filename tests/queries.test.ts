import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { CollectionName } from "#/common/mongo";
import type { Context } from "#/env";
import type { SchemaDocument } from "#/schemas/repository";
import queryJson from "./data/simple.query.json";
import {
  type AppFixture,
  type QueryFixture,
  buildFixture,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("query.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let organization: TestClient;
  let admin: TestClient;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.ctx.db;
    admin = fixture.users.admin;
    organization = fixture.users.organization;
    // placeholder schema id so addQuery passes validation
    query.schema = new UUID();
  });

  it("can list queries (expect 0)", async () => {
    const response = await organization.listQueries();
    expect(response.body.data).toHaveLength(0);
  });

  it("can add a query", async () => {
    const response = await admin.addQuery({
      _id: new UUID(),
      owner: organization.did,
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });

    const uuid = new UUID(response.body.data);
    expect(uuid).toBeTruthy();
    query.id = new UUID(response.body.data);
  });

  it("can list queries (expect 1)", async () => {
    const response = await organization.listQueries();
    expect(response.body.data).toHaveLength(1);
  });

  it("can delete a query", async () => {
    const _response = await organization.deleteQuery({
      id: query.id,
    });

    const queryDocument = await db.primary
      .collection<SchemaDocument>(CollectionName.Schemas)
      .findOne({ _id: query.id });

    expect(queryDocument).toBeNull();

    const record = await db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });
    assertDefined(record);

    expect(record.queries).toHaveLength(0);
  });
});
