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

    const response = await root.registerAccount({
      type: "admin",
      did: admin.did,
      publicKey: admin.publicKey,
      name: "admin account",
    });

    expect(response.body).toMatchObject({ data: admin.did });
  });

  it("admin can create organization account", async () => {
    organization = new TestClient({
      request: root.request,
      identity: Identity.new(),
      node: root._options.node,
    });

    const response = await admin.registerAccount({
      type: "organization",
      did: organization.did,
      publicKey: organization.publicKey,
      name: "organization account",
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
