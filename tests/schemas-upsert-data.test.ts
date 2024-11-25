import { faker } from "@faker-js/faker";
import { Chunk, Effect as E, Random as R, pipe } from "effect";
import type { Document } from "mongodb";
import { beforeAll, describe, expect, it } from "vitest";
import type { UuidDto } from "#/types";
import {
  type AppFixture,
  type OrganizationFixture,
  type QueryFixture,
  type SchemaFixture,
  buildAppFixture,
  setupOrganization,
} from "./fixture/app-fixture";
import { assertDefined, assertSuccessResponse } from "./fixture/assertions";

type TestRecordBase = {
  name: string;
  age: number;
};

describe("Schemas upsert data", () => {
  let fixture: AppFixture;

  const schema: SchemaFixture = {
    id: "" as UuidDto,
    name: "test-schemas-upsert-data",
    keys: ["name"],
    definition: {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "array",
      items: {
        type: "object",
        properties: {
          name: {
            type: "string",
          },
          age: {
            type: "number",
          },
        },
      },
    },
  };

  const query: QueryFixture = {
    id: "" as UuidDto,
    name: "test-schemas-upsert-data",
    schema: "" as UuidDto,
    variables: {},
    pipeline: [
      {
        $match: {
          name: "",
        },
      },
    ],
  };

  let organization: OrganizationFixture;
  const initialCollectionSize = 100;
  const firstAdditions = 9;
  const secondAdditions = 10;

  const data: TestRecordBase[] = Array.from(
    { length: initialCollectionSize },
    () => ({
      name: faker.person.fullName(),
      age: faker.number.int({ min: 21, max: 100 }),
    }),
  );

  beforeAll(async () => {
    fixture = await buildAppFixture();
  });

  it("setup organization and records", async () => {
    organization = await setupOrganization(fixture, schema, query);
  });

  it("can bulk upsert without conflicts", async () => {
    const schemaId = organization.schema.id;
    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data,
    });
    assertSuccessResponse(response);

    const records = await fixture.db.data
      .collection<TestRecordBase>(schemaId)
      .countDocuments();
    const { updated, created, errors } = response.data;

    expect(records).toBe(created);
    expect(0).toBe(updated);
    expect(0).toBe(errors);
  });

  it("can update one amongst many created", async () => {
    const additions = Array.from({ length: firstAdditions }, () => ({
      name: faker.person.fullName(),
      age: faker.number.int({ min: 21, max: 100 }),
    }));

    const randomIndex = Math.floor(Math.random() * data.length);
    const existing = data[randomIndex];

    const oldAge = existing.age;
    existing.age = R.nextIntBetween(21, 100).pipe(E.runSync);
    console.log("Updating record.age from %d to: %O", oldAge, existing);

    additions.push(existing);
    const shuffled = shuffle(additions);

    const schemaId = organization.schema.id;
    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data: shuffled,
    });
    assertSuccessResponse(response);

    const records = await fixture.db.data.collection(schemaId).countDocuments();
    const { updated, created, errors } = response.data;

    expect(records).toBe(firstAdditions + initialCollectionSize);
    expect(updated).toBe(1);
    expect(errors).toBe(0);

    const record = await fixture.db.data
      .collection<{ name: string; age: number }>(schemaId)
      .findOne({ name: existing.name });

    assertDefined(record);
    expect(record.age).toBe(existing.age);
  });

  it("can update and create multiple records in one request", async () => {
    const copy = [...data];
    const updates: TestRecordBase[] = [];

    for (const element of copy) {
      const shouldModify = Math.random() < 0.3;
      if (shouldModify) {
        updates.push({
          ...element,
          age: faker.number.int({ min: 21, max: 100 }),
        });
      }
    }

    const additions = Array.from({ length: 10 }, () => ({
      name: faker.person.fullName(),
      age: faker.number.int({ min: 21, max: 100 }),
    }));

    const moreData = shuffle([...updates, ...additions]);

    const schemaId = organization.schema.id;
    const response = await fixture.users.backend.uploadData({
      schema: schemaId,
      data: moreData,
    });
    assertSuccessResponse(response);

    const size = await fixture.db.data.collection(schemaId).countDocuments();
    expect(size).toBe(initialCollectionSize + 9 + 10);

    const { updated, created, errors } = response.data;
    expect(created).toBe(secondAdditions);
    expect(updated).toBe(updates.length);
    expect(errors).toBe(0);

    const records = await fixture.db.data
      .collection<TestRecordBase & Document>(schemaId)
      .find()
      .toArray();

    for (const record of records) {
      const original = find(data, record);
      const updated = find(updates, record);

      // if it was updated then it should have a different value form the original
      if (updated) {
        expect(original?.age).not.toBe(updated.age);
      }
    }
  });
});

const find = (
  data: TestRecordBase[],
  item: TestRecordBase,
): TestRecordBase | undefined => {
  return data.find((e) => e.name === item.name);
};

// returns a new array
const shuffle = <T>(data: T[]): T[] => {
  return pipe(data, R.shuffle, E.runSync, Chunk.toArray);
};
