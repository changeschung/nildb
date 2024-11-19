import { decode } from "hono/jwt";
import type { Document } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { UserBase } from "#/models/users";
import { type AppFixture, buildAppFixture } from "./fixture/app-fixture";
import { assertDefined, assertSuccessResponse } from "./fixture/assertions";

describe("Auth and accounts", () => {
  let fixture: AppFixture;

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("health check", async () => {
    const response = await fixture.users.root.health();
    expect(response).toBe("OK");
  });

  it("rejects unauthenticated requests", async () => {
    const response = await fixture.app.request("/api/v1/organizations");
    expect(response.status).toBe(401);
  });

  it("root can create an admin user", async () => {
    const { root, admin } = fixture.users;

    const response = await root.createUser({
      email: admin.email,
      password: admin.password,
      type: "admin",
    });

    assertSuccessResponse(response);

    const document = await fixture.clients.primary
      .db()
      .collection("users")
      .findOne<UserBase & Document>({ email: admin.email });

    assertDefined(document);

    expect(document.email).toEqual(admin.email);
    expect(document.type).toEqual("admin");
  });

  it("admin can login", async () => {
    const { admin } = fixture.users;
    const response = await admin.login();
    assertSuccessResponse(response);

    const document = await fixture.clients.primary
      .db()
      .collection("users")
      .findOne<UserBase & Document>({ email: admin.email });

    assertDefined(document);

    const { payload } = decode(response.data);
    expect(payload.sub).toMatch(document._id.toString());
    expect(payload.type).toMatch("admin");

    admin.jwt = response.data;
  });

  it("can delete admin user", async () => {
    const { admin } = fixture.users;

    const response = await admin.deleteUser({ email: admin.email });
    assertSuccessResponse(response);

    const document = await fixture.clients.primary
      .db()
      .collection("users")
      .findOne<UserBase & Document>({ email: admin.email });

    assertDefined(document);

    expect(document).toBeNull;
  });
});
