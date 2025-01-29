import { Effect as E, pipe } from "effect";
import type { OrganizationAccountDocument } from "#/accounts/accounts.types";
import type { App } from "#/app";
import { foldToApiResponse } from "#/common/handler";
import { enforceSchemaOwnership } from "#/common/ownership";
import { PathsV1 } from "#/common/paths";
import { payloadValidator } from "#/common/zod-utils";
import type {
  DataDocument,
  UpdateResult,
  UploadResult,
} from "#/data/data.repository";
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
  app.post(
    PathsV1.data.delete,
    payloadValidator(DeleteDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.deleteRecords(c.env, payload)),
        foldToApiResponse<number>(c),
        E.runPromise,
      );
    },
  );
}

export function flush(app: App): void {
  app.post(
    PathsV1.data.flush,
    payloadValidator(FlushDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) =>
          DataService.flushCollection(c.env, payload.schema),
        ),
        foldToApiResponse<number>(c),
        E.runPromise,
      );
    },
  );
}

export function read(app: App): void {
  app.post(
    PathsV1.data.read,
    payloadValidator(ReadDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.readRecords(c.env, payload)),
        foldToApiResponse<DataDocument[]>(c),
        E.runPromise,
      );
    },
  );
}

export function tail(app: App): void {
  app.post(
    PathsV1.data.tail,
    payloadValidator(TailDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.tailData(c.env, payload.schema)),
        foldToApiResponse<DataDocument[]>(c),
        E.runPromise,
      );
    },
  );
}

export function update(app: App): void {
  app.post(
    PathsV1.data.update,
    payloadValidator(UpdateDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) => DataService.updateRecords(c.env, payload)),
        foldToApiResponse<UpdateResult>(c),
        E.runPromise,
      );
    },
  );
}

export function upload(app: App): void {
  app.post(
    PathsV1.data.upload,
    payloadValidator(UploadDataRequestSchema),
    async (c) => {
      const account = c.var.account as OrganizationAccountDocument;
      const payload = c.req.valid("json");

      return await pipe(
        enforceSchemaOwnership(account, payload.schema, payload),
        E.flatMap((payload) =>
          DataService.createRecords(c.env, payload.schema, payload.data),
        ),
        foldToApiResponse<UploadResult>(c),
        E.runPromise,
      );
    },
  );
}
