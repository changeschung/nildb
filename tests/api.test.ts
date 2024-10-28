import { beforeAll, describe, expect, it } from "vitest";
import { type AppFixture, buildAppFixture } from "./fixture/app-fixture";

describe("Api", () => {
  let fixture: AppFixture;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("health check", async () => {
    const response = await fixture.users.root.health();
    expect(response).toBe("OK");
  });
});
