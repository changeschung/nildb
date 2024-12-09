import { faker } from "@faker-js/faker";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { CollectionName } from "#/common/mongo";
import type { Context } from "#/env";
import type { OrganizationDocument } from "#/organizations/repository";
import type { SchemaDocument } from "#/schemas/repository";
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

describe("query.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let admin: TestClient;
  let backend: TestClient;
  const organization = {
    id: new UUID(),
    schema: { ...schema, id: new UUID() } as SchemaFixture,
    query: { ...query, id: new UUID() } as unknown as QueryFixture,
  };

  beforeAll(async () => {
    fixture = await buildFixture();
    await setupAdmin(fixture);

    db = fixture.context.db;
    admin = fixture.users.admin;
    backend = fixture.users.backend;

    {
      const response = await admin
        .createOrganization({
          name: faker.company.name(),
        })
        .expect(200);
      organization.id = new UUID(response.body.data);
    }

    {
      const response = await admin
        .createOrganizationAccessToken({
          id: organization.id,
        })
        .expect(200);

      backend.jwt = response.body.data;
    }

    {
      const response = await backend
        .addSchema({
          org: organization.id,
          name: schema.name,
          keys: schema.keys,
          schema: schema.schema,
        })
        .expect(200);

      const id = new UUID(response.body.data);
      expect(id).toBeTruthy;

      organization.schema.id = id;
      organization.query.schema = organization.schema.id;
    }
  });

  it("can list queries (expect 0)", async () => {
    const response = await backend.listQueries().expect(200);
    expect(response.body.data).toHaveLength(0);
  });

  it("can add a query", async () => {
    const response = await backend
      .addQuery({
        org: organization.id,
        name: query.name,
        schema: organization.query.schema,
        variables: query.variables,
        pipeline: query.pipeline,
      })
      .expect(200);

    const uuid = new UUID(response.body.data);
    expect(uuid).toBeTruthy;
    organization.query.id = new UUID(response.body.data);
  });

  it("can list queries (expect 1)", async () => {
    const response = await backend.listQueries().expect(200);
    expect(response.body.data).toHaveLength(1);
  });

  it("can delete a query", async () => {
    const _response = await backend
      .deleteQuery({
        id: organization.query.id,
      })
      .expect(200);

    const queryDocument = await db.primary
      .collection<SchemaDocument>(CollectionName.Schemas)
      .findOne({ _id: organization.query.id });

    expect(queryDocument).toBeNull();

    const record = await db.primary
      .collection<OrganizationDocument>(CollectionName.Organizations)
      .findOne({ _id: organization.id });
    assertDefined(record);

    expect(record.queries).toHaveLength(0);
  });
});
