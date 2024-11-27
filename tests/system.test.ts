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

  it("reports app version", () => {
    return admin.version().expect(200).expect({
      version: packageJson.version,
    });
  });
});
