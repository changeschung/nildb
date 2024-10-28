import Ajv from "ajv";
import { Effect as E } from "effect";
import type { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "#/app";
import { findOrgById } from "#/models/orgs";
import {
  addOrgSchemaRecord,
  createOrgSchemaCollection,
} from "#/models/schemas";
import { createShortId, findRootError } from "#/utils";

export const OrgSchemaRegistration = z.object({
  primaryKeys: z.array(z.string()),
  schema: z.record(z.unknown()),
});
export type OrgSchemaRegistration = z.infer<typeof OrgSchemaRegistration>;

export type AddSchemaPath = "/api/v1/orgs/schemas";

export function handleAddSchema(app: Hono<AppEnv>, path: AddSchemaPath): void {
  app.post(path, (c) => {
    return E.Do.pipe(
      E.let("orgId", () => c.get("jwtPayload").sub),
      E.bind("reqBody", () =>
        E.tryPromise(async () => {
          const raw = await c.req.json<unknown>();
          return OrgSchemaRegistration.parse(raw);
        }),
      ),
      E.bind("schema", ({ reqBody }) =>
        E.tryPromise(async () => {
          try {
            const schemaObject = reqBody.schema;
            const ajv = new Ajv({ strict: false });
            ajv.compile(schemaObject);

            return {
              keys: reqBody.primaryKeys,
              schema: reqBody.schema,
              schemaId: createShortId(),
            };
          } catch (e) {
            c.var.log.warn(`Failed to validate org schema: ${e}`);
            throw e;
          }
        }),
      ),
      E.bind("orgRecord", ({ orgId }) => findOrgById(orgId)),
      E.bind("org", ({ orgId, schema, orgRecord }) =>
        addOrgSchemaRecord(
          orgId,
          `${orgRecord.prefix}_schema_${schema.schemaId}`,
          schema.schema,
        ),
      ),
      E.flatMap(({ org, schema }) => {
        const name = `${org.prefix}_schema_${schema.schemaId}`;
        return createOrgSchemaCollection(c.var.db.mongo, schema.keys, name);
      }),
      E.match({
        onFailure: (e) => {
          const status = findRootError(e, "add schema", c.var.log);
          return c.text("", status);
        },
        onSuccess: (name) => {
          c.var.log.info(`Created schema: ${name}`);
          return c.text(name, 201);
        },
      }),
      E.runPromise,
    );
  });
}
