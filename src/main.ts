import dotenv from "dotenv";
import { buildApp } from "./app";
import { createLogger } from "./common/logging";
import { createContext } from "./env";

async function main() {
  dotenv.config();

  const context = await createContext();
  const Log = createLogger(context.config);
  const app = buildApp(context);
  app.listen(context.config.webPort);
  Log.info(`Api ready on ${context.config.webPort}`);
}

await main();
