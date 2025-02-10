import { Effect as E, pipe } from "effect";
import type { App } from "#/app";
import { handleTaggedErrors } from "#/common/handler";
import { PathsV1 } from "#/common/paths";
import { payloadValidator } from "#/common/zod-utils";
import * as DataService from "#/data/data.services";
import {
  DeleteDataRequestSchema,
  FlushDataRequestSchema,
  ReadDataRequestSchema,
  TailDataRequestSchema,
  UpdateDataRequestSchema,
  UploadDataRequestSchema,
} from "#/data/data.types";

export function remove(app: App): void {
  app.post(
    PathsV1.admin.data.delete,
    payloadValidator(DeleteDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.deleteRecords(c.env, payload),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function flush(app: App): void {
  app.post(
    PathsV1.admin.data.flush,
    payloadValidator(FlushDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.flushCollection(c.env, payload.schema),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function read(app: App): void {
  app.post(
    PathsV1.admin.data.read,
    payloadValidator(ReadDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.readRecords(c.env, payload),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function tail(app: App): void {
  app.post(
    PathsV1.admin.data.tail,
    payloadValidator(TailDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.tailData(c.env, payload.schema),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function update(app: App): void {
  app.post(
    PathsV1.admin.data.update,
    payloadValidator(UpdateDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.updateRecords(c.env, payload),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}

export function upload(app: App): void {
  app.post(
    PathsV1.admin.data.upload,
    payloadValidator(UploadDataRequestSchema),
    async (c) => {
      const payload = c.req.valid("json");

      return pipe(
        DataService.createRecords(c.env, payload.schema, payload.data),
        E.map((data) => c.json({ data })),
        handleTaggedErrors(c),
        E.runPromise,
      );
    },
  );
}
