import dotenv from "dotenv";
import { buildApp } from "./app";
import { createContext } from "./env";

async function main() {
  dotenv.config();

  const context = await createContext();
  const app = buildApp(context);
  app.listen(context.config.webPort);
  context.log.info(`Api ready on ${context.config.webPort}`);
}

await main();
