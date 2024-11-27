import { faker } from "@faker-js/faker";
import { decode } from "jsonwebtoken";
import { beforeAll, describe, expect, it } from "vitest";
import type { Context } from "#/env";
import type { JwtPayload } from "#/middleware/auth";
import type { UserBase } from "#/users/repository";
import { type AppFixture, buildFixture } from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("users.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let root: TestClient;
  let admin: TestClient;

  beforeAll(async () => {
    fixture = await buildFixture();
    db = fixture.context.db;
    root = fixture.users.root;
    admin = fixture.users.admin;
  });

  it("rejects unauthenticated requests", () => {
    return admin
      .createUser({
        email: faker.internet.email(),
        password: faker.internet.password(),
        type: "admin",
      })
      .expect(401);
  });

  it("root can create an admin user", async () => {
    const response = await root.createUser({
      email: admin.email,
      password: admin.password,
      type: "admin",
    });

    expect(response.status).toBe(200);

    const body = response.body;
    expect(body).toBeTruthy();

    const document = await db.primary
      .collection("users")
      .findOne<UserBase>({ email: admin.email });

    assertDefined(document);

    expect(document.email).toEqual(admin.email);
    expect(document.type).toEqual("admin");
  });

  it("rejects invalid passwords", async () => {
    return admin
      .login({
        email: admin.email,
        password: faker.internet.password(),
      })
      .expect(401);
  });

  it("rejects invalid username", async () => {
    return admin
      .login({
        email: faker.internet.email(),
        password: fixture.users.admin.password,
      })
      .expect(401);
  });

  it("admin can login", async () => {
    const { admin } = fixture.users;
    const response = await admin.login({
      email: admin.email,
      password: admin.password,
    });

    expect(response.status).toBe(200);

    const document = await db.primary
      .collection("users")
      .findOne<UserBase>({ email: admin.email });

    assertDefined(document);

    admin.jwt = response.body.data;
    const payload = decode(admin.jwt) as unknown as JwtPayload;
    expect(payload.sub).toMatch(document._id.toString());
    expect(payload.type).toMatch("admin");
  });

  it("can delete user", async () => {
    const { admin } = fixture.users;

    const response = await root.deleteUser({ email: admin.email });
    expect(response.status).toBe(200);

    const document = await db.primary
      .collection("users")
      .findOne<UserBase>({ email: admin.email });

    expect(document).toBeNull;
  });
});
