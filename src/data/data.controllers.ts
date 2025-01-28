import { zValidator } from "@hono/zod-validator";
import { Effect as E, pipe } from "effect";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { PathsV1 } from "#/common/paths";
import * as DataService from "./data.services";
import {
  DeleteDataRequestSchema,
  FlushDataRequestSchema,
  ReadDataRequestSchema,
  TailDataRequestSchema,
  UpdateDataRequestSchema,
  UploadDataRequestSchema,
} from "./data.types";

export function deleteD(app: App): void {
  app.delete(
    PathsV1.data.root,
    zValidator("json", DeleteDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.deleteRecords(c.env, payload)),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function flush(app: App): void {
  app.post(
    PathsV1.data.flush,
    zValidator("json", FlushDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) =>
          DataService.flushCollection(c.env, payload.schema),
        ),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function read(app: App): void {
  app.post(
    PathsV1.data.read,
    zValidator("json", ReadDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.readRecords(c.env, payload)),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function tail(app: App): void {
  app.post(
    PathsV1.data.tail,
    zValidator("json", TailDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.tailData(c.env, payload.schema)),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function update(app: App): void {
  app.put(
    PathsV1.data.root,
    zValidator("json", UpdateDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.updateRecords(c.env, payload)),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}

export function upload(app: App): void {
  app.post(
    PathsV1.data.upload,
    zValidator("json", UploadDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) =>
          DataService.createRecords(c.env, payload.schema, payload.data),
        ),
        foldToApiResponse(c),
        E.runPromise,
      );
    },
  );
}
