import { describe } from "vitest";
import { createUuidDto } from "#/common/types";
import type { UploadResult } from "#/data/data.repository";
import schemaJson from "./data/coercions.schema.json";
import {
  expectErrorResponse,
  expectSuccessResponse,
} from "./fixture/assertions";
import type { SchemaFixture } from "./fixture/fixture";
import { createTestFixtureExtension } from "./fixture/it";

describe("data operations", () => {
  const schema = schemaJson as unknown as SchemaFixture;
  const { it, beforeAll, afterAll } = createTestFixtureExtension({
    schema,
  });
  beforeAll(async (_ctx) => {});
  afterAll(async (_ctx) => {});

  it("coerces valid data", async ({ expect, organization, bindings }) => {
    const testId = createUuidDto();
    const testDate = new Date().toISOString();
    const testDouble = "123.45";

    const data = [
      {
        _id: testId,
        date_from_string: testDate,
        numeric_from_string: testDouble,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const result = await expectSuccessResponse<UploadResult>(response);
    expect(result.data.created).toHaveLength(1);
    expect(result.data.errors).toHaveLength(0);

    const documents = await bindings.db.data
      .collection(schema.id.toString())
      .find({})
      .toArray();

    const document = documents[0];

    expect(document._id.toString()).toBe(testId);
    expect(document.date_from_string.toISOString()).toBe(testDate);
    expect(document.numeric_from_string).toBe(Number(testDouble));
  });

  it("rejects invalid date-time strings", async ({ expect, organization }) => {
    const testId = createUuidDto();
    const notADate = new Date().toISOString().split("T")[0]; // just take date
    const testDouble = "123.45";

    const data = [
      {
        _id: testId,
        date_from_string: notADate,
        numeric_from_string: testDouble,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const errors = await expectErrorResponse(response);

    expect(errors.errors).toHaveLength(2);
    expect(errors.errors[0]).toBe("DataValidationError");
    expect(errors.errors[1]).toBe(
      '/0/date_from_string: must match format "date-time"',
    );
  });

  it("rejects invalid numeric strings", async ({ expect, organization }) => {
    const testId = createUuidDto();
    const notADate = new Date().toISOString();
    const testDouble = "abcde"; // not numeric

    const data = [
      {
        _id: testId,
        date_from_string: notADate,
        numeric_from_string: testDouble,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const errors = await expectErrorResponse(response);

    expect(errors.errors).toHaveLength(2);
    expect(errors.errors[0]).toBe("DataValidationError");
    expect(errors.errors[1]).toBe(
      '/0/numeric_from_string: must match format "numeric"',
    );
  });

  it("rejects invalid uuid strings", async ({ expect, organization }) => {
    const testId = "xxxx-xxxx";
    const notADate = new Date().toISOString();
    const testDouble = "42";

    const data = [
      {
        _id: testId,
        date_from_string: notADate,
        numeric_from_string: testDouble,
      },
    ];

    const response = await organization.uploadData({
      schema: schema.id,
      data,
    });

    const errors = await expectErrorResponse(response);

    expect(errors.errors).toHaveLength(2);
    expect(errors.errors[0]).toBe("DataValidationError");
    expect(errors.errors[1]).toBe('/0/_id: must match format "uuid"');
  });
});
