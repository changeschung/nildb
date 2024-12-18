import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { CollectionName } from "#/common/mongo";
import { createUuidDto } from "#/common/types";
import type { CreatedResult } from "#/data/repository";
import type { SchemaDocument } from "#/schemas/repository";
import schemaJson from "./data/wallet.schema.json";
import {
  type AppFixture,
  type SchemaFixture,
  buildFixture,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("schemas.test.ts", () => {
  let fixture: AppFixture;
  let admin: TestClient;
  let organization: TestClient;
  const schema = schemaJson as unknown as SchemaFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    admin = fixture.users.admin;
    organization = fixture.users.organization;
  });

  it("can list schemas (expect 0)", async () => {
    const response = await organization.listSchemas();
    expect(response.body.data).toHaveLength(0);
  });

  it("can add schema", async () => {
    const response = await admin.addSchema({
      _id: new UUID(),
      owner: organization.did,
      name: schema.name,
      keys: schema.keys,
      schema: schema.schema,
    });

    const uuid = new UUID(response.body.data);
    expect(uuid).toBeTruthy;

    const document = await fixture.ctx.db.primary
      .collection(CollectionName.Accounts)
      .findOne({
        schema: { $elemMatch: { $in: [uuid] } },
      });
    assertDefined(document);

    schema.id = new UUID(response.body.data);
  });

  it("can upload data", async () => {
    const response = await organization.uploadData({
      schema: schema.id,
      data: [
        {
          _id: createUuidDto(),
          wallet: "0x1",
          country: "GBR",
          age: 42,
        },
      ],
    });

    const result = response.body.data as CreatedResult;
    expect(result.created).toHaveLength(1);

    const data = await fixture.ctx.db.data
      .collection(schema.id.toString())
      .find()
      .toArray();

    expect(data).toHaveLength(1);
    expect(data[0]?.age).toBe(42);
  });

  it("can list schemas (expect 1)", async () => {
    const response = await organization.listSchemas();
    expect(response.body.data).toHaveLength(1);
  });

  it("can delete schema", async () => {
    const id = schema.id;
    const response = await organization.deleteSchema({
      id,
    });

    const schemaDocument = await fixture.ctx.db.primary
      .collection<SchemaDocument>(CollectionName.Schemas)
      .findOne({ _id: new UUID(response.body.data) });

    expect(schemaDocument).toBeNull();

    const organizationDocument = await fixture.ctx.db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });
    assertDefined(organizationDocument);

    expect(organizationDocument.schemas).toHaveLength(0);

    const dataCount = await fixture.ctx.db.data
      .collection(id.toString())
      .countDocuments({});

    expect(dataCount).toBe(0);
  });
});
