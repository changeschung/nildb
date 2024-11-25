import { faker } from "@faker-js/faker";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { MAX_RECORDS_LENGTH } from "#/handlers/data-handle-upload";
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
  assertFailureResponse,
  assertSuccessResponse,
} from "./fixture/assertions";

describe("Schemas upload max records length", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "test-schemas-upload-max-records",
    keys: ["value"],
    definition: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      items: {
        type: "object",
        properties: {
          value: {
            type: "string",
          },
        },
      },
    },
  };

  const query: QueryFixture = {
    id: "" as UuidDto,
    name: "test-query-upload-max-records",
    schema: "" as UuidDto,
    variables: {},
    pipeline: [
      {
        $match: {
          value: "",
        },
      },
    ],
  };

  let organization: OrganizationFixture;
  let collectionName: UuidDto;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("setup organization and records", async () => {
    organization = await setupOrganization(fixture, schema, query);
    collectionName = organization.schema.id;
  });

  it("rejects payload that exceeds MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH + 1 }, () => ({
      value: new UUID().toString(),
    }));

    const response = await fixture.users.backend.uploadData({
      schema: collectionName,
      data,
    });
    assertFailureResponse(response);

    expect(response.errors[0]).toMatch(
      `Max data length is ${MAX_RECORDS_LENGTH} elements`,
    );
  });

  it("accepts payload at MAX_RECORDS_LENGTH", async () => {
    const data = Array.from({ length: MAX_RECORDS_LENGTH }, () => ({
      value: new UUID().toString(),
    }));

    const response = await fixture.users.backend.uploadData({
      schema: collectionName,
      data,
    });
    assertSuccessResponse(response);

    expect(response.data.errors).toBe(0);
    expect(response.data.updated).toBe(0);
    expect(response.data.created).toBe(MAX_RECORDS_LENGTH);
  });
});
