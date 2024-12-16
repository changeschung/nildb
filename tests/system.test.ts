import { beforeAll, describe, expect, it } from "vitest";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";
import type { TestClient } from "./fixture/client";

describe("system.test.ts", () => {
  let fixture: AppFixture;
  let admin: TestClient;

  beforeAll(async () => {
    fixture = await buildFixture();
    admin = fixture.users.admin;
  });

  it("responds to health checks", () => {
    return admin.health().expect(200);
  });

  it("reports app version", async () => {
    const response = await admin.about().expect(200);
    const body = response.body;

    expect(body.build.version).toBe("0.0.0");
    expect(body.did).toBe(fixture.ctx.node.identity.did);
    expect(body.publicKey).toBe(fixture.ctx.node.identity.publicKey);
  });
});
