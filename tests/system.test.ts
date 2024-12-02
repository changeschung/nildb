import packageJson from "package.json";
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

    expect(body.version).toBe(packageJson.version);
    expect(body.address).toBe(
      "nillion11q073p3a4wjhw3kffnev3c675mnf0j5rk86tr6s",
    );
    expect(body.publicKey).toBe("A0wcqQiz1QW1jOiqXVgD8qilY2RB3IB6qTyMKiym0ATZ");
  });
});
