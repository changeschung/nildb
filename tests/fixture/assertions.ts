import { expect } from "vitest";
import type {
  ApiErrorResponse,
  ApiResponse,
  ApiSuccessResponse,
} from "#/handlers/handler";

export function assertSuccessResponse<T>(
  response: ApiResponse<T>,
): asserts response is ApiSuccessResponse<T> {
  expect("data" in response).toBeTruthy();
}

export function assertFailureResponse<T>(
  response: ApiResponse<T>,
): asserts response is ApiErrorResponse {
  expect("errors" in response).toBeTruthy();
}

export function assertDefined<T>(
  value: T | undefined | null,
): asserts value is T {
  expect(value).toBeDefined();
}
