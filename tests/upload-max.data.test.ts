import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import type { Context } from "#/env";
import type { TestClient } from "./fixture/client";
import schema from "./data/simple.schema.json";
import query from "./data/simple.query.json";
import { MAX_RECORDS_LENGTH } from "#/data/controllers";

describe("upload.max.data.test", () => {
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

  it("rejects payload that exceeds MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH + 1 }, () => ({
      _id: new UUID().toString(),
    }));

    const response = await fixture.users.backend
      .uploadData({
        schema: organization.schema.id,
        data,
      })
      .expect(200);

    expect(response.body.errors[0]).toMatch(
      `Max data length is ${MAX_RECORDS_LENGTH} elements`,
    );
  });

  it("accepts payload at MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH }, () => ({
      _id: new UUID().toString(),
    }));

    const response = await fixture.users.backend
      .uploadData({
        schema: organization.schema.id,
        data,
      })
      .expect(200);

    expect(response.body.data.errors).toHaveLength(0);
    expect(response.body.data.created).toHaveLength(MAX_RECORDS_LENGTH);
  });
});
