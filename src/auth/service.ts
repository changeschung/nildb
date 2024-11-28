import argon2 from "argon2";
import { Effect as E, pipe } from "effect";
import type { DbError } from "#/common/errors";
import { type UserBase, UserRepository } from "#/users/repository";

export function authenticateUser(
  email: string,
  password: string,
): E.Effect<UserBase, DbError | Error> {
  return pipe(
    UserRepository.findByEmail(email),

    E.flatMap((user) =>
      E.tryPromise(async () => {
        const valid = await argon2.verify(user.password, password);
        if (!valid) throw new Error("Unauthorized");
        return user;
      }),
    ),
  );
}
