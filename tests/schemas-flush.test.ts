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
import { assertSuccessResponse } from "./fixture/assertions";

describe("Schemas flush collection", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "test-schemas-flush-schema",
    keys: [],
    definition: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
        },
      },
    },
  };

  const query: QueryFixture = {
    id: "" as UuidDto,
    name: "test-schemas-flush-query",
    schema: "" as UuidDto,
    variables: {},
    pipeline: [
      {
        $match: {
          name: "",
        },
      },
    ],
  };

  let organization: OrganizationFixture;

  const collectionSize = 100;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("can setup organization and records", async () => {
    organization = await setupOrganization(fixture, schema, query);
    const schemaId = organization.schema.id;

    const data = Array.from({ length: collectionSize }, () => ({
      name: faker.person.fullName(),
    }));

    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data,
    });
    assertSuccessResponse(response);

    const records = await fixture.db.data.collection(schemaId).countDocuments();
    expect(records).toBe(response.data);
  });

  it("can flush collection", async () => {
    const schema = organization.schema.id;

    const response = await fixture.users.backend.flushData({ schema });
    assertSuccessResponse(response);

    const count = await fixture.db.data.collection(schema).countDocuments();
    expect(response.data).toBe(collectionSize);
    expect(count).toBe(0);
  });
});
