import dotenv from "dotenv";
import { createLogger } from "./common/logging";
import { createContext } from "./env";
import { buildApp } from "./app";

async function main() {
  dotenv.config();

  const context = await createContext();
  const Log = createLogger(context.config);
  const app = buildApp(context);
  app.listen(context.config.webPort);
  Log.info(`Api ready on ${context.config.webPort}`);
}

await main();
