import { expect } from "vitest";
import type { ApiErrorResponse, ApiSuccessResponse } from "#/common/handler";

export function assertDefined<T>(
  value: T | undefined | null,
): asserts value is T {
  expect(value).toBeDefined();
}

export async function expectSuccessResponse<T>(
  response: Response,
): Promise<ApiSuccessResponse<T>> {
  expect(response.status).toBe(200);
  const body = (await response.json()) as ApiSuccessResponse<T>;
  expect(body.data).toBeDefined();
  return body;
}

export async function expectErrorResponse(
  response: Response,
): Promise<ApiErrorResponse> {
  expect(response.status).toBeGreaterThanOrEqual(400);
  const body = (await response.json()) as ApiErrorResponse;
  expect(body.errors).toBeDefined();
  return body;
}
