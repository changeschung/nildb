import { faker } from "@faker-js/faker";
import supertest from "supertest";
import type { App } from "supertest/types";
import { beforeAll, describe, expect, it } from "vitest";
import { AccountsEndpointV1 } from "#/accounts/routes";
import { AdminEndpointV1 } from "#/admin/routes";
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
import { TestOrganizationUserClient } from "./fixture/test-org-user-client";

describe("access-management.test.ts", () => {
  let fixture: AppFixture;
  let organization: TestOrganizationUserClient;
  let organizationB: TestOrganizationUserClient;
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
    const token = await organization.jwt();
    const body = {
      did: organization.did,
      publicKey: organization.publicKey,
      name: faker.person.fullName(),
    };

    const response = await organization.request
      .post(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`)
      .send(body);

    expect(response.status).toBe(401);
  });

  it("organizations cannot list accounts", async () => {
    const token = await organization.jwt();
    const response = await organization.request
      .get(AdminEndpointV1.Accounts.Base)
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  describe("enforces cross org access restrictions", () => {
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

      organizationB = new TestOrganizationUserClient({
        request: supertest(fixture.app as App),
        identity: Identity.new(),
        node: fixture.ctx.node,
      });

      await organizationB.register({
        did: organizationB.did,
        publicKey: organizationB.publicKey,
        name: faker.company.name(),
      });
    });

    it("prevents data upload", async () => {
      const response = await organizationB.uploadData(
        {
          schema: schema.id,
          data: [
            {
              _id: createUuidDto(),
              name: faker.person.fullName(),
            },
          ],
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });

    it("prevents data reads", async () => {
      const response = await organizationB.readData(
        {
          schema: schema.id,
          filter: {},
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });

    it("prevents data updates", async () => {
      const record = data[Math.floor(Math.random() * collectionSize)];
      const filter = { name: record.name };
      const update = { name: "foo" };
      const response = await organizationB.updateData(
        {
          schema: schema.id,
          filter,
          update,
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });

    it("prevents data deletes", async () => {
      const record = data[Math.floor(Math.random() * collectionSize)];
      const filter = { name: record.name };
      const response = await organizationB.deleteData(
        {
          schema: schema.id,
          filter,
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });

    it("prevents data flush", async () => {
      const response = await organizationB.flushData(
        {
          schema: schema.id,
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });

    it("prevents data tail", async () => {
      const response = await organizationB.tailData(
        {
          schema: schema.id,
        },
        false,
      );

      const errors = response.body.errors as string[];
      expect(errors).toContain("Schema not found");
    });
  });
});
