import { faker } from "@faker-js/faker";
import { decode } from "hono/jwt";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { CollectionName } from "#/models/names";
import type { OrganizationBase } from "#/models/organizations";
import type { SchemaBase } from "#/models/schemas";
import type { UuidDto } from "#/types";
import { type AppFixture, buildAppFixture } from "./fixture/app-fixture";
import {
  assertDefined,
  assertFailureResponse,
  assertSuccessResponse,
} from "./fixture/assertions";

describe("Organizations", () => {
  let fixture: AppFixture;

  const organization = {
    name: faker.company.name(),
    id: "" as UuidDto,
    schema: {
      id: "" as UuidDto,
      name: "foo",
      keys: ["wallet"],
      definition: {
        $schema: "http://json-schema.org/draft-07/schema#",
        type: "array",
        uniqueItems: true,
        items: {
          type: "object",
          properties: {
            wallet: {
              type: "string",
              description: "Unique wallet identifier",
            },
            country_code: {
              type: "string",
              description: "String code representing the user's country",
            },
            age: {
              type: "integer",
              description: "User's age",
            },
          },
          required: ["wallet", "country_code", "age"],
        },
      },
    },
    query: {
      id: "" as UuidDto,
      name: "foo query",
      schema: "" as UuidDto,
      variables: {},
      pipeline: [
        {
          $match: {
            country_code: "GBR",
          },
        },
        {
          $group: {
            _id: null,
            averageAge: { $avg: "$age" },
            count: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            averageAge: 1,
            count: 1,
          },
        },
      ],
    },
  };

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("can create an organization", async () => {
    const response = await fixture.users.root.createOrganization({
      name: organization.name,
    });

    assertSuccessResponse(response);

    const document = await fixture.clients.primary
      .db()
      .collection<OrganizationBase>(CollectionName.Organizations)
      .findOne({
        _id: new UUID(response.data),
      });

    assertDefined(document);

    expect(document.name).toMatch(organization.name);
    expect(document.schemas).toEqual([]);
    expect(document.queries).toEqual([]);

    organization.id = response.data;
  });

  it("can generate an access key", async () => {
    const response = await fixture.users.root.createOrganizationAccessToken({
      id: organization.id,
    });

    assertSuccessResponse(response);

    const { payload } = decode(response.data);
    expect(payload.sub).toMatch(organization.id);
    expect(payload.type).toMatch("access-token");
    fixture.users.backend.jwt = response.data;
  });

  it("can list schemas (expect 0)", async () => {
    const response = await fixture.users.backend.listSchemas();
    assertSuccessResponse(response);

    expect(response.data).toHaveLength(0);
  });

  it("can add schema", async () => {
    const response = await fixture.users.backend.addSchema({
      org: organization.id,
      name: organization.schema.name,
      keys: organization.schema.keys,
      schema: organization.schema.definition,
    });
    assertSuccessResponse(response);

    const uuid = new UUID(response.data);
    expect(uuid).toBeTruthy;

    organization.schema.id = response.data;
    organization.query.schema = response.data;
  });

  it("can list schemas (expect 1)", async () => {
    const response = await fixture.users.backend.listSchemas();
    assertSuccessResponse(response);

    expect(response.data).toHaveLength(1);
  });

  it("can upload data", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: "0x1",
        country_code: "GBR",
        age: 20,
      },
      {
        wallet: "0x2",
        country_code: "CAN",
        age: 30,
      },
      {
        wallet: "0x3",
        country_code: "GBR",
        age: 40,
      },
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

  it("rejects primary key collisions", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: "0x1",
        country_code: "GBR",
        age: 30,
      },
    ];

    const response = await fixture.users.backend.uploadData({
      schema,
      data,
    });
    assertFailureResponse(response);

    expect(response.errors).toHaveLength(1);

    const cursor = fixture.clients.data.db().collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects duplicates in data payload", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: "0x4",
        country_code: "GBR",
        age: 30,
      },
      {
        wallet: "0x4",
        country_code: "GBR",
        age: 30,
      },
    ];

    const response = await fixture.users.backend.uploadData({
      schema,
      data,
    });
    assertFailureResponse(response);

    const cursor = fixture.clients.data.db().collection(schema).find({});
    const records = await cursor.toArray();
    expect(records).toHaveLength(3);
  });

  it("rejects data that does not conform", async () => {
    const schema = organization.schema.id;
    const data = [
      {
        wallet: true,
        country_code: "GBR",
        age: 30,
      },
    ];

    const response = await fixture.users.backend.uploadData({
      schema,
      data,
    });
    assertFailureResponse(response);
    expect(response.errors).toHaveLength(1);
  });

  it("can list queries", async () => {
    const response = await fixture.users.backend.listQueries();
    assertSuccessResponse(response);

    expect(response.data).toHaveLength(0);
  });

  it("can add a query", async () => {
    const { id, query } = organization;
    const response = await fixture.users.backend.addQuery({
      org: id,
      name: query.name,
      schema: query.schema,
      variables: query.variables,
      pipeline: query.pipeline,
    });
    assertSuccessResponse(response);

    const uuid = new UUID(response.data);
    expect(uuid).toBeTruthy;

    organization.query.id = response.data;
  });

  it("can list queries", async () => {
    const response = await fixture.users.backend.listQueries();
    assertSuccessResponse(response);

    expect(response.data).toHaveLength(1);
  });

  it("can run a query", async () => {
    const { query } = organization;
    const response = await fixture.users.backend.executeQuery({
      id: query.id,
      variables: query.variables,
    });
    assertSuccessResponse(response);

    expect(response.data).toEqual([
      {
        averageAge: 30,
        count: 2,
      },
    ]);
  });

  it("can delete a query", async () => {
    const { id } = organization.query;

    const response = await fixture.users.backend.deleteQuery({
      id,
    });
    assertSuccessResponse(response);

    const queryDocument = await fixture.clients.primary
      .db()
      .collection<SchemaBase>(CollectionName.Schemas)
      .findOne({ _id: new UUID(id) });

    expect(queryDocument).toBeNull();

    const record = await fixture.clients.primary
      .db()
      .collection<OrganizationBase>(CollectionName.Organizations)
      .findOne({ _id: new UUID(organization.id) });
    assertDefined(record);

    expect(record.queries).toHaveLength(0);
  });

  it("can delete schema", async () => {
    const { id } = organization.schema;
    const response = await fixture.users.backend.deleteSchema({
      id,
    });
    assertSuccessResponse(response);

    const schemaDocument = await fixture.clients.primary
      .db()
      .collection<SchemaBase>(CollectionName.Schemas)
      .findOne({ _id: new UUID(id) });

    expect(schemaDocument).toBeNull();

    const organizationDocument = await fixture.clients.primary
      .db()
      .collection<OrganizationBase>(CollectionName.Organizations)
      .findOne({ _id: new UUID(organization.id) });
    assertDefined(organizationDocument);

    expect(organizationDocument.schemas).toHaveLength(0);

    const dataCount = await fixture.clients.data
      .db()
      .collection(id)
      .countDocuments({});

    expect(dataCount).toBe(0);
  });

  it("can delete organizations", async () => {
    const response = await fixture.users.root.deleteOrganization({
      id: organization.id,
    });
    assertSuccessResponse(response);

    const document = await fixture.clients.primary
      .db()
      .collection<OrganizationBase>(CollectionName.Organizations)
      .findOne({ id: new UUID(organization.id) });

    expect(document).toBeNull();
  });
});
