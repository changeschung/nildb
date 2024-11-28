import argon2 from "argon2";
import { Effect as E, pipe } from "effect";
import type { Db } from "mongodb";
import type { DbError } from "#/common/errors";
import { type UserDocument, UserRepository } from "#/users/repository";

export function authenticateUser(
  db: Db,
  email: string,
  password: string,
): E.Effect<UserDocument, DbError | Error> {
  return pipe(
    UserRepository.findByEmail(db, email),

    E.flatMap((user) =>
      E.tryPromise(async () => {
        const valid = await argon2.verify(user.password, password);
        if (!valid) throw new Error("Unauthorized");
        return user;
      }),
    ),
  );
}
