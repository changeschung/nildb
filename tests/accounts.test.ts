import { faker } from "@faker-js/faker";
import { StatusCodes } from "http-status-codes";
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

  it("root can create an admin account", async ({ expect, bindings, root }) => {
    const admin = Identity.new();
    const response = await root.createAccount({
      did: admin.did,
      publicKey: admin.pk,
      name: faker.person.fullName(),
      type: "admin",
    });

    expect(response.status).toBe(StatusCodes.CREATED);

    const document = await bindings.db.primary
      .collection(CollectionName.Accounts)
      .findOne({ did: admin.did });
    expect(document).toBeDefined;
  });

  it("admin can register an organization account", async ({
    expect,
    bindings,
    admin,
  }) => {
    const organization = Identity.new();
    const response = await admin.createAccount({
      did: organization.did,
      publicKey: organization.pk,
      name: faker.company.name(),
      type: "organization",
    });

    expect(response.status).toBe(StatusCodes.CREATED);

    const document = await bindings.db.primary
      .collection(CollectionName.Accounts)
      .findOne({ did: organization.did });
    expect(document).toBeDefined;
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

    expect(response.status).toBe(StatusCodes.CREATED);

    const document = await bindings.db.primary
      .collection(CollectionName.Accounts)
      .findOne({ did: newOrganization.did });
    expect(document).toBeDefined;
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

    expect(response.status).toBe(StatusCodes.NO_CONTENT);

    const documents = await bindings.db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });

    expect(documents).toBeNull();
  });
});
