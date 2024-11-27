import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { Effect as E, Option as O, pipe } from "effect";
import { UUID } from "mongodb";
import mongoose from "mongoose";
import { type DbError, succeedOrMapToDbError } from "#/common/errors";
import { CollectionName, type DocumentBase } from "#/common/mongo";

export type UserBase = DocumentBase & {
  email: string;
  password: string;
  type: "root" | "admin";
};

const UserDocumentSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.UUID,
    default: () => randomUUID(),
    get: (val: Buffer) => new UUID(val),
  },
  email: { type: String, unique: true, index: true },
  password: String,
  type: { type: String, enum: ["root", "admin"] },
});

const Model = mongoose.model(CollectionName.Users, UserDocumentSchema);

export const Repository = {
  findByEmail(email: string): E.Effect<UserBase, DbError> {
    const filter = { email: email.toLowerCase() };

    return pipe(
      E.tryPromise(async () => {
        const result = await Model.findOne(filter).lean<UserBase>();
        return O.fromNullable(result);
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Users,
        name: "findByEmail",
        params: { filter },
      }),
    );
  },

  create(data: Omit<UserBase, "_id">): E.Effect<UUID, Error> {
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
          const document = await Model.create(data);
          return new UUID(document._id);
        }),
      ),
      succeedOrMapToDbError({
        collection: CollectionName.Users,
        name: "create",
        params: { data },
      }),
    );
  },

  delete(email: string): E.Effect<boolean, DbError> {
    const filter = { email };
    return pipe(
      E.tryPromise(async () => {
        const result = await Model.deleteOne(filter);
        return result.deletedCount === 1;
      }),
      succeedOrMapToDbError({
        collection: CollectionName.Users,
        name: "delete",
        params: { filter },
      }),
    );
  },
} as const;
