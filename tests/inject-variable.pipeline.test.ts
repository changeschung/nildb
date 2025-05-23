import { Effect as E, Either, pipe } from "effect";
import { describe, it } from "vitest";
import { injectVariablesIntoAggregation } from "#/queries/queries.services";

describe("pipeline variable injection", () => {
  it("replaces simple variables", async ({ expect }) => {
    const pipeline = [
      {
        $match: { wallet: "##address" },
      },
    ];

    const variables = { address: "abc123" };

    const actual = pipe(
      injectVariablesIntoAggregation(pipeline, variables),
      E.runSync,
    );

    const expected = [
      {
        $match: { wallet: "abc123" },
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("replaces multiple variable types", async ({ expect }) => {
    const pipeline = [
      {
        $match: {
          wallet: "##address",
          amount: "##value",
          active: "##isActive",
        },
      },
    ];

    const variables = {
      address: "abc123",
      value: 1000,
      isActive: false,
    };

    const actual = pipe(
      injectVariablesIntoAggregation(pipeline, variables),
      E.runSync,
    );

    const expected = [
      {
        $match: {
          wallet: "abc123",
          amount: 1000,
          active: false,
        },
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("throws error for missing variables", async ({ expect }) => {
    const pipeline = [
      {
        $match: { wallet: "##address" },
      },
    ];

    const variables = {};

    const result = pipe(
      injectVariablesIntoAggregation(pipeline, variables),
      E.either,
      E.runSync,
    );

    expect(Either.isLeft(result)).toBeTruthy();

    if (Either.isLeft(result)) {
      const error = result.left;
      expect(error.message).toContain("Missing pipeline variable");
      expect(error.message).toContain("##address");
    }
  });

  it("handles complex pipeline with multiple stages", async ({ expect }) => {
    const pipeline = [
      {
        $match: {
          status: "##status",
          _created: { $gt: "##startDate" },
        },
      },
      {
        $lookup: {
          from: "##collection",
          localField: "##localField",
          foreignField: "id",
          as: "joined",
        },
      },
      {
        $unwind: "$joined",
      },
      {
        $group: {
          _id: { $concat: ["$joined.", "##groupField"] },
          total: { $sum: "##valueField" },
        },
      },
    ];

    const variables = {
      status: "active",
      startDate: "2024-01-01",
      collection: "users",
      localField: "userId",
      groupField: "category",
      valueField: 1,
    };

    const actual = pipe(
      injectVariablesIntoAggregation(pipeline, variables),
      E.runSync,
    );

    const expected = [
      {
        $match: {
          status: "active",
          _created: { $gt: "2024-01-01" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "id",
          as: "joined",
        },
      },
      {
        $unwind: "$joined",
      },
      {
        $group: {
          _id: { $concat: ["$joined.", "category"] },
          total: { $sum: 1 },
        },
      },
    ];

    expect(actual).toEqual(expected);
  });

  it("handles deeply nested structures", async ({ expect }) => {
    const pipeline = [
      {
        $match: {
          $or: [
            { type: "##type1" },
            { category: { $in: ["##category1", "##category2"] } },
            {
              $and: [
                { status: "##status" },
                {
                  nested: {
                    deep: {
                      value: "##deepValue",
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ];

    const variables = {
      type1: "special",
      category1: "A",
      category2: "B",
      status: "active",
      deepValue: "nested-value",
    };

    const actual = pipe(
      injectVariablesIntoAggregation(pipeline, variables),
      E.runSync,
    );

    const expected = [
      {
        $match: {
          $or: [
            { type: "special" },
            { category: { $in: ["A", "B"] } },
            {
              $and: [
                { status: "active" },
                {
                  nested: {
                    deep: {
                      value: "nested-value",
                    },
                  },
                },
              ],
            },
          ],
        },
      },
    ];

    expect(actual).toEqual(expected);
  });
});
