import { beforeAll, describe, expect, it } from "vitest";
import { AccountsEndpointV1 } from "#/accounts/routes";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("access-management.test.ts", () => {
  let fixture: AppFixture;
  let organization: TestClient;

  beforeAll(async () => {
    fixture = await buildFixture();
    organization = fixture.users.organization;
  });

  it("rejects unauthenticated requests", async () => {
    const response = await fixture.users.admin.request.get(
      AccountsEndpointV1.Base,
    );
    expect(response.status).toBe(401);
  });

  it("organizations cannot create accounts", async () => {
    const response = await organization.registerAccount({
      type: "organization",
      did: organization.did,
      publicKey: organization.publicKey,
      name: "organization account",
    });

    expect(response.status).toBe(401);
  });

  it("organizations cannot list accounts", async () => {
    const response = await organization.listAccounts();
    expect(response.status).toBe(401);
  });
});
