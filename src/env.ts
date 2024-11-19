import { z } from "zod";

const EnvSchema = z.object({
  dbNamePrefix: z.string().min(4),
  dbUri: z.string().startsWith("mongodb"),
  env: z.enum(["test", "dev", "prod"]),
  jwtSecret: z.string().min(10),
  logLevel: z.enum(["debug", "info", "warn", "error"]),
  webPort: z.number().int().positive(),
});

export type Bindings = z.infer<typeof EnvSchema>;

let env: Bindings;
export function loadEnv(): Bindings {
  if (env) {
    return env;
  }

  return EnvSchema.parse({
    dbNamePrefix: process.env.APP_DB_NAME_PREFIX,
    dbUri: process.env.APP_DB_URI,
    env: process.env.APP_ENV,
    jwtSecret: process.env.APP_JWT_SECRET,
    logLevel: process.env.APP_LOG_LEVEL,
    webPort: Number(process.env.APP_PORT),
  });
}
