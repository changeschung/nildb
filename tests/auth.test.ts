import { faker } from "@faker-js/faker";
import { beforeAll, describe, it } from "vitest";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";

describe("auth.test.ts", () => {
  let fixture: AppFixture;

  beforeAll(async () => {
    fixture = await buildFixture();
  });

  it("access-tokens cannot access /api/v1/users", () => {
    return fixture.users.backend
      .createUser({
        email: faker.internet.email(),
        password: faker.internet.password(),
        type: "admin",
      })
      .expect(401);
  });

  it("access-tokens cannot access /api/v1/organizations", () => {
    return fixture.users.backend
      .createOrganization({
        name: faker.company.name(),
      })
      .expect(401);
  });
});
