import { faker } from "@faker-js/faker";
import supertest from "supertest";
import type { App } from "supertest/types";
import { beforeAll, describe, expect, it } from "vitest";
import { AccountsEndpointV1 } from "#/accounts/routes";
import { Identity } from "#/common/identity";
import { createUuidDto } from "#/common/types";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import { TestClient } from "./fixture/client";

describe("access-management.test.ts", () => {
  let fixture: AppFixture;
  let organization: TestClient;
  let organizationB: TestClient;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
    organization = fixture.users.organization;
    await registerSchemaAndQuery(fixture, schema, query);
  });

  it("rejects unauthenticated requests", async () => {
    const response = await fixture.users.admin.request.get(
      AccountsEndpointV1.Base,
    );
    expect(response.status).toBe(401);
  });

  it("organizations cannot create admin accounts", async () => {
    const response = await organization.createAdminAccount(
      {
        did: organization.did,
        publicKey: organization.publicKey,
        name: faker.person.fullName(),
      },
      false,
    );

    expect(response.status).toBe(401);
  });

  it("organizations cannot list accounts", async () => {
    const response = await organization.listAccounts(false);
    expect(response.status).toBe(401);
  });

  describe.skip("it enforces data ownership", () => {
    const collectionSize = 10;
    const data = Array.from({ length: collectionSize }, () => ({
      _id: createUuidDto(),
      name: faker.person.fullName(),
    }));

    beforeAll(async () => {
      const _response = await organization.uploadData({
        schema: schema.id,
        data,
      });

      organizationB = new TestClient({
        request: supertest(fixture.app as App),
        identity: Identity.new(),
        node: fixture.ctx.node,
      });

      await fixture.users.admin.registerAccount({
        did: organizationB.did,
        publicKey: organizationB.publicKey,
        name: faker.company.name(),
      });
    });

    it("prevents cross organization reads", async () => {
      const record = data[Math.floor(Math.random() * collectionSize)];
      const filter = { name: record.name };
      const response = await organizationB.readData({
        schema: schema.id,
        filter,
      });

      const errors = response.body.errors as string[];
      expect(errors).toEqual(
        "UserErrorMessage.ResourceNotFound.reasons(schema.id.toString()),",
      );
    });
  });
});
