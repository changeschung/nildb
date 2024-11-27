import { faker } from "@faker-js/faker";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { CollectionName } from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import type { InsertResult } from "#/data/repository";
import type { Context } from "#/env";
import type { OrganizationBase } from "#/organizations/repository";
import type { SchemaBase } from "#/schemas/repository";
import query from "./data/wallet.query.json";
import schema from "./data/wallet.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  setupAdmin,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("schemas.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let backend: TestClient;
  const organization = {
    id: "" as UuidDto,
    schema: schema as SchemaFixture,
    query: query as QueryFixture,
  };

  beforeAll(async () => {
    fixture = await buildFixture();
    await setupAdmin(fixture);

    db = fixture.context.db;
    const admin = fixture.users.admin;
    backend = fixture.users.backend;

    {
      const response = await admin
        .createOrganization({
          name: faker.company.name(),
        })
        .expect(200);
      organization.id = response.body.data;
    }

    {
      const response = await admin
        .createOrganizationAccessToken({
          id: organization.id!,
        })
        .expect(200);

      backend.jwt = response.body.data;
    }
  });

  it("can list schemas (expect 0)", async () => {
    const response = await backend.listSchemas().expect(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("can add schema", async () => {
    const response = await backend
      .addSchema({
        org: organization.id,
        name: schema.name,
        keys: schema.keys,
        schema: schema.schema,
      })
      .expect(200);

    const uuid = new UUID(response.body.data);
    expect(uuid).toBeTruthy;

    schema.id = response.body.data;
  });

  it("can upload data", async () => {
    const response = await backend
      .uploadData({
        schema: organization.schema.id,
        data: [
          {
            _id: faker.string.uuid(),
            wallet: "0x1",
            country: "GBR",
            age: 42,
          },
        ],
      })
      .expect(200);

    const result = response.body.data as InsertResult;
    expect(result.created).toBe(1);

    const data = await db.data.collection(schema.id).find().toArray();

    expect(data).toHaveLength(1);
    expect(data[0]?.age).toBe(42);
  });

  it("can list schemas (expect 1)", async () => {
    const response = await backend.listSchemas().expect(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("can delete schema", async () => {
    const id = organization.schema.id;
    await backend
      .deleteSchema({
        id,
      })
      .expect(200);

    const schemaDocument = await db.primary
      .collection<SchemaBase>(CollectionName.Schemas)
      .findOne({ _id: new UUID(id) });

    expect(schemaDocument).toBeNull();

    const organizationDocument = await db.primary
      .collection<OrganizationBase>(CollectionName.Organizations)
      .findOne({ _id: new UUID(organization.id) });
    assertDefined(organizationDocument);

    expect(organizationDocument.schemas).toHaveLength(0);

    const dataCount = await db.data.collection(id).countDocuments({});

    expect(dataCount).toBe(0);
  });
});
