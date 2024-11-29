import { UUID } from "mongodb";
import { z } from "zod";

// From node:crypto but re-exported here to avoid collisions with mongodb's UUID class
export type UuidDto = `${string}-${string}-${string}-${string}-${string}`;

export const Uuid = z
  .string()
  .uuid()
  .transform((val) => new UUID(val));

export function createUuidDto(): UuidDto {
  return new UUID().toString() as UuidDto;
}
