import { decode } from "hono/jwt";
import { beforeAll, describe, expect, it } from "vitest";
import type { UserDocument } from "#/models/users";
import { type AppFixture, buildAppFixture } from "./fixture/app-fixture";

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
    const response = await fixture.app.request("/api/v1/admin/users");
    expect(response.status).toBe(401);
  });

  it("root can create an admin user", async () => {
    const { root, admin } = fixture.users;

    const { data } = await root.createUser({
      email: admin.email,
      password: admin.password,
      type: "admin",
    });

    const record = await fixture.clients.db
      .db()
      .collection("users")
      .findOne<UserDocument>({ email: admin.email });

    expect(record?.email).toEqual(data.email);
    expect(record?.type).toEqual("admin");
  });

  it("admin can login", async () => {
    const { admin } = fixture.users;
    const { token } = await admin.login();
    const { payload } = decode(token);
    expect(payload.sub).toMatch(admin.email);
    expect(payload.type).toMatch("admin");

    admin.jwt = token;
  });

  it("can delete admin user", async () => {
    const { admin } = fixture.users;

    const success = await admin.deleteUser(admin.email);
    expect(success).toBeTruthy();

    const record = (await fixture.clients.db
      .db()
      .collection("users")
      .findOne({ email: admin.email })) as UserDocument;

    expect(record).toBeNull;
  });
});
