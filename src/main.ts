import dotenv from "dotenv";
import { buildApp } from "./app";
import { createContext } from "./env";

async function main() {
  dotenv.config();

  const context = await createContext();
  const app = buildApp(context);
  app.listen(context.config.webPort);
  context.log.info(`Node public address ${context.node.address}`);
  context.log.info(`Node public endpoint ${context.node.endpoint}`);
  context.log.info(`Node local port ${context.config.webPort}`);
}

await main();
