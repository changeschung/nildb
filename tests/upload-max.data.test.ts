import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
import { MAX_RECORDS_LENGTH } from "#/data/controllers";
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

describe("upload.max.data.test", () => {
  let fixture: AppFixture;
  let backend: TestClient;
  let organization: OrganizationFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    backend = fixture.users.backend;
    organization = await setupOrganization(
      fixture,
      { ...schema, id: new UUID() } as SchemaFixture,
      { ...query, id: new UUID() } as unknown as QueryFixture,
    );
  });

  const nextDocument = () => ({
    _id: createUuidDto(),
    // insufficient unique full names in faker so use uuids for testing limit
    name: createUuidDto(),
  });

  it("rejects payload that exceeds MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH + 1 }, () =>
      nextDocument(),
    );

    const response = await backend
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
    const data = Array.from({ length: MAX_RECORDS_LENGTH }, () =>
      nextDocument(),
    );

    const response = await backend
      .uploadData({
        schema: organization.schema.id,
        data,
      })
      .expect(200);

    expect(response.body.data.errors).toHaveLength(0);
    expect(response.body.data.created).toHaveLength(MAX_RECORDS_LENGTH);
  });
});
