import { faker } from "@faker-js/faker";
import { describe } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import { Identity } from "#/common/identity";
import { CollectionName } from "#/common/mongo";
import { expectSuccessResponse } from "./fixture/assertions";
import { createTestFixtureExtension } from "./fixture/it";
import { TestOrganizationUserClient } from "./fixture/test-client";

describe("account management", () => {
  const { it, beforeAll, afterAll } = createTestFixtureExtension();
  beforeAll(async (_ctx) => {});
  afterAll(async (_ctx) => {});

  it("root can create an admin account", async ({ expect, root }) => {
    const admin = Identity.new();
    const response = await root.createAccount({
      did: admin.did,
      publicKey: admin.pk,
      name: faker.person.fullName(),
      type: "admin",
    });

    const data = await expectSuccessResponse(response);
    expect(data.data).toBe(admin.did);
  });

  it("admin can register an organization account", async ({
    expect,
    admin,
  }) => {
    const organization = Identity.new();
    const response = await admin.createAccount({
      did: organization.did,
      publicKey: organization.pk,
      name: faker.company.name(),
      type: "organization",
    });

    const data = await expectSuccessResponse(response);
    expect(data.data).toBe(organization.did);
  });

  it("organization can get its own profile", async ({
    expect,
    organization,
  }) => {
    const response = await organization.getAccount();
    const data = await expectSuccessResponse(response);

    expect(data.data).toMatchObject({
      _id: organization.did,
      _type: "organization",
    });
  });

  it("an organization can self register", async ({ app, bindings, expect }) => {
    const newOrganization = new TestOrganizationUserClient({
      app,
      identity: Identity.new(),
      node: bindings.node,
    });

    const response = await newOrganization.register({
      did: newOrganization.did,
      publicKey: newOrganization.publicKey,
      name: faker.company.name(),
    });

    const data = await expectSuccessResponse(response);
    expect(data.data).toBe(newOrganization.did);
  });

  it("admin can remove an organization account", async ({
    expect,
    bindings,
    admin,
    organization,
  }) => {
    const response = await admin.deleteAccount({
      id: organization.did,
    });

    const data = await expectSuccessResponse(response);
    expect(data.data).toBe(organization.did);

    const documents = await bindings.db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });

    expect(documents).toBeNull();
  });
});
