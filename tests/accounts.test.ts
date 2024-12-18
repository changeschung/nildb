import { faker } from "@faker-js/faker";
import { beforeAll, describe, expect, it } from "vitest";
import type { OrganizationAccountDocument } from "#/accounts/repository";
import { Identity } from "#/common/identity";
import { CollectionName } from "#/common/mongo";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";
import { TestClient } from "./fixture/client";

describe("accounts.test.ts", () => {
  let fixture: AppFixture;
  let root: TestClient;
  let admin: TestClient;
  let organization: TestClient;

  beforeAll(async () => {
    fixture = await buildFixture();
    root = fixture.users.root;
  });

  it("root can create an admin account", async () => {
    admin = new TestClient({
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
    organization = new TestClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await admin.registerAccount({
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
    const organization = new TestClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await organization.registerAccount({
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
