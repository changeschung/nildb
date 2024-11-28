import argon2 from "argon2";
import { Effect as E, Option as O, pipe } from "effect";
import { type Db, type StrictFilter, UUID } from "mongodb";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type UserDocument = DocumentBase & {
  email: string;
  password: string;
  type: "root" | "admin";
};

export const UserRepository = {
  findByEmail(db: Db, email: string): E.Effect<UserDocument, DbError> {
    const collection = db.collection<UserDocument>(CollectionName.Users);
    const filter: StrictFilter<UserDocument> = { email: email.toLowerCase() };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.findOne(filter);
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        name: "findByEmail",
        params: { filter },
      }),
    );
  },

  create(
    db: Db,
    data: Omit<UserDocument, keyof DocumentBase>,
  ): E.Effect<UUID, Error> {
    const collection = db.collection<UserDocument>(CollectionName.Users);

    return pipe(
      E.tryPromise(async () => {
        const salted = await argon2.hash(data.password);
        return {
          email: data.email.toLowerCase(),
          password: salted,
          type: data.type,
        };
      }),
      E.flatMap((data) =>
        E.tryPromise(async () => {
          const now = new Date();
          const document: UserDocument = {
            ...data,
            _id: new UUID(),
            _created: now,
            _updated: now,
          };

          const result = await collection.insertOne(document);
          return result.insertedId;
        }),
      ),
      succeedOrMapToDbError({
        name: "create",
        params: { data },
      }),
    );
  },

  delete(db: Db, email: string): E.Effect<string, DbError> {
    const collection = db.collection<UserDocument>(CollectionName.Users);
    const filter: StrictFilter<UserDocument> = { email };

    return pipe(
      E.tryPromise(async () => {
        const result = await collection.deleteOne(filter);
        return result.deletedCount === 1 ? O.some(email) : O.none();
      }),
      succeedOrMapToDbError({
        name: "delete",
        params: { filter },
      }),
    );
  },
} as const;
