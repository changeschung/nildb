import { faker } from "@faker-js/faker";
import { StatusCodes } from "http-status-codes";
import { beforeAll, describe, expect, it } from "vitest";
import { type UuidDto, createUuidDto } from "#/common/types";
import { TAIL_DATA_LIMIT } from "#/data/repository";
import queryJson from "./data/simple.query.json";
import schemaJson from "./data/simple.schema.json";
import {
  type AppFixture,
  type QueryFixture,
  type SchemaFixture,
  buildFixture,
  registerSchemaAndQuery,
} from "./fixture/app-fixture";
import type { TestAdminUserClient } from "./fixture/test-admin-user-client";
import type { TestOrganizationUserClient } from "./fixture/test-org-user-client";

describe("subscriptions.test.ts", () => {
  let fixture: AppFixture;
  let admin: TestAdminUserClient;
  let organization: TestOrganizationUserClient;
  const schema = schemaJson as unknown as SchemaFixture;
  const query = queryJson as unknown as QueryFixture;

  type Data = {
    _id: UuidDto;
    name: string;
  };
  const collectionSize = 100;
  const data = Array.from(
    { length: collectionSize },
    () =>
      ({
        _id: createUuidDto(),
        name: faker.person.fullName(),
      }) satisfies Data,
  );

  beforeAll(async () => {
    fixture = await buildFixture();
    admin = fixture.users.admin;
    organization = fixture.users.organization;

    await registerSchemaAndQuery(fixture, schema, query);
    const _response = await organization.uploadData({
      schema: schema.id,
      data,
    });
  });

  it("no subscription required for admins", async () => {
    const response = await admin.tailData({
      schema: schema.id,
    });

    const data = response.body.data as Data[];
    expect(data).toHaveLength(TAIL_DATA_LIMIT);
  });

  it("rejects if subscription inactive", async () => {
    const _setSubscriptionStateResponse = await admin.setSubscriptionState({
      active: false,
      ids: [organization.did],
    });

    const tailDataResponse = await organization.tailData(
      {
        schema: schema.id,
      },
      false,
    );

    expect(tailDataResponse.status).toBe(StatusCodes.PAYMENT_REQUIRED);
  });

  it("accepts if subscription active", async () => {
    const _setSubscriptionStateResponse = await admin.setSubscriptionState({
      active: true,
      ids: [organization.did],
    });

    const tailDataResponse = await organization.tailData(
      {
        schema: schema.id,
      },
      false,
    );

    const data = tailDataResponse.body.data as Data[];
    expect(data).toHaveLength(TAIL_DATA_LIMIT);
  });
});
