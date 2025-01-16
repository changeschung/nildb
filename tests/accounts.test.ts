import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { Identity } from "#/common/identity";
import { CollectionName } from "#/common/mongo";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";
import { TestAdminUserClient } from "./fixture/test-admin-user-client";
import { TestOrganizationUserClient } from "./fixture/test-org-user-client";
import type { TestRootUserClient } from "./fixture/test-root-user-client";

describe("accounts.test.ts", () => {
  let fixture: AppFixture;
  let root: TestRootUserClient;
  let admin: TestAdminUserClient;
  let organization: TestOrganizationUserClient;

  beforeAll(async () => {
    fixture = await buildFixture();
    root = fixture.users.root;
  });

  it("root can create an admin account", async () => {
    admin = new TestAdminUserClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await root.createAdminAccount({
      did: admin.did,
      publicKey: admin.publicKey,
      name: faker.person.fullName(),
    });

    expect(response.body).toMatchObject({ data: admin.did });
  });

  it("admin can register an organization account", async () => {
    organization = new TestOrganizationUserClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await admin.registerOrganizationAccount({
      did: organization.did,
      publicKey: organization.publicKey,
      name: faker.company.name(),
    });

    expect(response.body).toMatchObject({ data: organization.did });
  });

  it("organization can get its own profile", async () => {
    const response = await organization.getAccount();
    expect(response.body.data).toMatchObject({
      _id: organization.did,
      _type: "organization",
    });
  });

  it("an organization can self register", async () => {
    const organization = new TestOrganizationUserClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await organization.register({
      did: organization.did,
      publicKey: organization.publicKey,
      name: faker.company.name(),
    });

    expect(response.body).toMatchObject({ data: organization.did });
  });

  it("admin can remove an organization account", async () => {
    const response = await admin.deleteAccount({
      id: organization.did,
    });

    expect(response.body).toMatchObject({ data: organization.did });

    const documents = await fixture.ctx.db.primary
      .collection<OrganizationAccountDocument>(CollectionName.Accounts)
      .findOne({ _id: organization.did });

    expect(documents).toBeNull();
  });
});
