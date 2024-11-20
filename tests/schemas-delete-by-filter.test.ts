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
  assertFailureResponse,
  assertSuccessResponse,
} from "./fixture/assertions";

describe("Schemas delete by filter", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "test-schemas-delete-by-filter-schema",
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
    name: "test-schemas-delete-by-filter-query",
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

  const collectionSize = 103;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("can setup organization and records", async () => {
    organization = await setupOrganization(fixture, schema, query);
    const schemaId = organization.schema.id;

    const data = Array.from({ length: collectionSize - 3 }, () => ({
      name: faker.person.fullName(),
    }));

    data.push({ name: "foo" });
    data.push({ name: "bar" });
    data.push({ name: "bar" });

    const shuffledData = [...data].sort(() => Math.random() - 0.5);

    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data: shuffledData,
    });
    assertSuccessResponse(response);

    const records = await fixture.db.data.collection(schemaId).countDocuments();
    expect(records).toBe(response.data);
    expect(records).toBe(collectionSize);
  });

  it("rejects empty filter", async () => {
    const schema = organization.schema.id;
    const filter = {};

    const response = await fixture.users.backend.deleteData({ schema, filter });
    assertFailureResponse(response);

    expect(response.errors).toHaveLength(1);
  });

  it("can remove a single match", async () => {
    const schema = organization.schema.id;
    const filter = { name: "foo" };

    const response = await fixture.users.backend.deleteData({ schema, filter });
    assertSuccessResponse(response);

    const count = await fixture.db.data.collection(schema).countDocuments();
    expect(response.data).toBe(1);
    expect(count).toBe(collectionSize - 1);
  });

  it("can remove multiple matches", async () => {
    const schema = organization.schema.id;
    const filter = { name: "bar" };

    const response = await fixture.users.backend.deleteData({ schema, filter });
    assertSuccessResponse(response);

    const count = await fixture.db.data.collection(schema).countDocuments();
    expect(response.data).toBe(2);
    expect(count).toBe(collectionSize - 3);
  });
});
