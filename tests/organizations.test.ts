import { faker } from "@faker-js/faker";
import { decode } from "jsonwebtoken";
import { UUID } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import { CollectionName } from "#/common/mongo";
import type { UuidDto } from "#/common/types";
import type { Context } from "#/env";
import type { JwtPayload } from "#/middleware/auth";
import type { OrganizationDocument } from "#/organizations/repository";
import {
  type AppFixture,
  buildFixture,
  setupAdmin,
} from "./fixture/app-fixture";
import { assertDefined } from "./fixture/assertions";
import type { TestClient } from "./fixture/client";

describe("organizations.test.ts", () => {
  let fixture: AppFixture;
  let db: Context["db"];
  let admin: TestClient;
  let backend: TestClient;

  const organization = {
    name: faker.company.name(),
    id: new UUID(),
  };

  beforeAll(async () => {
    fixture = await buildFixture();
    await setupAdmin(fixture);
    db = fixture.context.db;
    admin = fixture.users.admin;
    backend = fixture.users.backend;
  });

  it("can create an organization", async () => {
    const response = await admin
      .createOrganization({
        name: organization.name,
      })
      .expect(200);

    const data: UuidDto = response.body.data;
    expect(data).toBeDefined();

    const document = await db.primary
      .collection<OrganizationDocument>(CollectionName.Organizations)
      .findOne({
        _id: new UUID(data),
      });

    assertDefined(document);

    expect(document.name).toMatch(organization.name);
    expect(document.schemas).toEqual([]);
    expect(document.queries).toEqual([]);

    organization.id = new UUID(data);
  });

  // skipped because db artefacts conflicting when running entire suite
  it.skip("can list organizations", async () => {
    const response = await admin.listOrganizations().expect(200);
    const organisations = response.body.data as OrganizationDocument[];
    expect(organisations).toHaveLength(1);
    expect(organisations[0]._id).toBe(organization.id);
  });

  it("can generate an access key", async () => {
    const response = await admin
      .createOrganizationAccessToken({
        id: organization.id,
      })
      .expect(200);

    backend.jwt = response.body.data;
    const payload = decode(backend.jwt) as unknown as JwtPayload;
    expect(payload.sub).toMatch(organization.id.toString());
    expect(payload.type).toMatch("access-token");
  });

  it("can delete an organization", async () => {
    const _response = await admin
      .deleteOrganization({
        id: organization.id,
      })
      .expect(200);

    const document = await db.primary
      .collection<OrganizationDocument>(CollectionName.Organizations)
      .findOne({ id: new UUID(organization.id) });

    expect(document).toBeNull();
  });
});
