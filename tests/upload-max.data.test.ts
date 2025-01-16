import { beforeAll, describe, expect, it } from "vitest";
import { createUuidDto } from "#/common/types";
import { MAX_RECORDS_LENGTH } from "#/data/controllers";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import type { TestOrganizationUserClient } from "./fixture/test-org-user-client";

describe("upload.max.data.test", () => {
  let fixture: AppFixture;
  let organization: TestOrganizationUserClient;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    organization = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);
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

    const response = await organization.uploadData(
      {
        schema: schema.id,
        data,
      },
      false,
    );

    expect(response.body.errors).toContain(
      "key=data, reason=Length must be non zero and lte 10000",
    );
  });

  it("accepts payload at MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH }, () =>
      nextDocument(),
    );

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    expect(response.body.data.errors).toHaveLength(0);
    expect(response.body.data.created).toHaveLength(MAX_RECORDS_LENGTH);
  });
});
