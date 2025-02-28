import { StatusCodes } from "http-status-codes";
import { describe, expect } from "vitest";
import type { LogLevelInfo } from "#/admin/admin.types";
import { createTestFixtureExtension } from "./fixture/it";

describe("log level management", () => {
  const { it, beforeAll, afterAll } = createTestFixtureExtension();
  beforeAll(async (_ctx) => {});
  afterAll(async (_ctx) => {});

  it("should return current log level", async ({ admin, bindings }) => {
    const response = await admin.getLogLevel();
    expect(response.status).toBe(StatusCodes.OK);

    const result = (await response.json()) as LogLevelInfo;
    expect(result).toHaveProperty("level");
    expect(result.level).toEqual(bindings.log.level);
    expect(result).toHaveProperty("levelValue");
    expect(result.levelValue).toEqual(bindings.log.levelVal);
  });

  it("can set log level", async ({ admin, bindings }) => {
    const request = {
      level: "info",
    } as const;

    const response = await admin.setLogLevel(request);
    expect(response.status).toBe(StatusCodes.OK);
    expect(bindings.log.level).toEqual(request.level);
  });
});
