import { Effect as E, pipe } from "effect";
import { type OrgDocument, OrgDocumentModel } from "#/models/orgs";

export function removeOrgQueryRecord(
  orgId: string,
  queryName: string,
): E.Effect<OrgDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      OrgDocumentModel.findOneAndUpdate(
        { _id: orgId },
        { $unset: { [`queries.${queryName}`]: "" } },
      ),
    ),
    E.flatMap((doc) =>
      doc === null
        ? E.fail(
            new Error(`Failed to remove orgs/${orgId}/queries/${queryName}`),
          )
        : E.succeed(doc as OrgDocument),
    ),
    E.mapError(
      (cause) =>
        new Error(`Failed to remove orgs/${orgId}/queries/${queryName}`, {
          cause,
        }),
    ),
  );
}

export function addOrgQueryRecord(
  orgId: string,
  queryName: string,
  pipeline: string,
  schema: string,
): E.Effect<OrgDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      OrgDocumentModel.findOneAndUpdate(
        { _id: orgId },
        {
          $set: {
            [`queries.${queryName}`]: {
              pipeline,
              schema,
            },
          },
        },
      ),
    ),
    E.flatMap((doc) =>
      doc === null
        ? E.fail(new Error(`Failed to find orgs/${orgId}`))
        : E.succeed(doc as OrgDocument),
    ),
    E.mapError(
      (cause) =>
        new Error(`Failed to add orgs/${orgId}/queries/${queryName}`, {
          cause,
        }),
    ),
    E.map((result) => result as OrgDocument),
  );
}
