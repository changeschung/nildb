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
  expect(response.ok).toBeTruthy();
  const body = (await response.json()) as ApiSuccessResponse<T>;
  expect(body.data).toBeDefined();
  return body;
}

export async function expectErrorResponse(
  response: Response,
): Promise<ApiErrorResponse> {
  expect(response.ok).toBeFalsy();
  const body = (await response.json()) as ApiErrorResponse;
  expect(body.errors).toBeDefined();
  return body;
}
