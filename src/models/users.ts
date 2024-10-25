import argon2 from "argon2";
import { Effect as E, pipe } from "effect";
import { id } from "effect/Fiber";
import mongoose from "mongoose";
import type { CreateUserReqBody } from "#/handlers/handle-create-user";

export interface UserDocument extends mongoose.Document {
  email: string;
  password: string;
  type: "root" | "admin";
}

export const UserDocumentSchema = new mongoose.Schema(
  {
    email: { type: String, unique: true, index: true },
    password: String,
    type: { type: String, enum: ["root", "admin"] },
  },
  { timestamps: true },
);

export const UserDocumentModel = mongoose.model("user", UserDocumentSchema);

export function findUserByEmail(email: string): E.Effect<UserDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      UserDocumentModel.findOne({ email: email.toLowerCase() }),
    ),
    E.flatMap(E.fromNullable),
    E.mapError((cause) => new Error(`User not found: ${email}`, { cause })),
    E.map((record) => record as UserDocument),
  );
}

export function createUserRecord(
  user: CreateUserReqBody,
): E.Effect<UserDocument, Error> {
  return pipe(
    E.tryPromise(async () => argon2.hash(user.password)),
    E.flatMap((salted) =>
      E.tryPromise(() =>
        new UserDocumentModel({
          email: user.email.toLowerCase(),
          password: salted,
          type: user.type,
        }).save(),
      ),
    ),
    E.mapError(
      (cause) =>
        new Error(`Failed to create ${user.type}/users/${user.email}`, {
          cause,
        }),
    ),
    E.map((result) => result as UserDocument),
  );
}

export function deleteUserRecord(email: string): E.Effect<UserDocument, Error> {
  return pipe(
    E.tryPromise(() =>
      UserDocumentModel.findOneAndDelete({
        email,
      }),
    ),
    E.flatMap((result) => {
      return result?.email === email
        ? E.succeed(result)
        : E.fail(new Error(`Failed to delete users/${id}`));
    }),
    E.map((result) => result as UserDocument),
  );
}
