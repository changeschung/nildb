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

describe("Schemas datetime type", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "datetime",
    keys: [],
    definition: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      uniqueItems: true,
      items: {
        type: "object",
        properties: {
          datetime: {
            type: "string",
            format: "date-time",
          },
        },
        required: ["datetime"],
      },
    },
  };

  const query: QueryFixture = {
    id: "" as UuidDto,
    name: "foo query",
    schema: "" as UuidDto,
    variables: {},
    pipeline: [
      {
        $match: {
          datetime: "2024-03-19T14:30:00Z",
        },
      },
      {
        $project: {
          _id: 0,
          datetime: 1,
        },
      },
    ],
  };

  let organization: OrganizationFixture;

  beforeAll(async () => {
    fixture = await buildAppFixture();
    organization = await setupOrganization(fixture, schema, query);
  });

  it("can upload date-times", async () => {
    const schema = organization.schema.id;

    const data = [
      { datetime: "2024-03-19T14:30:00Z" },
      { datetime: "2024-03-19T14:30:00.123Z" },
      { datetime: "2024-03-19T14:30:00+01:00" },
    ];

    const response = await fixture.users.backend.uploadData({
      schema,
      data,
    });
    assertSuccessResponse(response);
    expect(response.data).toBe(3);

    const cursor = fixture.clients.data.db().collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects invalid date-times", async () => {
    const schema = organization.schema.id;
    const data = [
      { datetime: "2024-03-19" }, // missing time
      { datetime: "14:30:00" }, // missing date
      { datetime: "2024-13-19T14:30:00Z" }, // invalid month
      { datetime: "not a date" }, // completely invalid
      { datetime: 12345 }, // wrong type
    ];

    for (const invalid of data) {
      const response = await fixture.users.backend.uploadData({
        schema,
        data: [invalid],
      });
      assertFailureResponse(response);
    }
  });

  it("can run query with datetime data", async () => {
    const response = await fixture.users.backend.executeQuery({
      id: organization.query.id,
      variables: organization.query.variables,
    });
    assertSuccessResponse(response);

    expect(response.data).toEqual([
      {
        datetime: "2024-03-19T14:30:00Z",
      },
    ]);
  });
});
