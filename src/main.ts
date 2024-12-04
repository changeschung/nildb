import dotenv from "dotenv";
import { buildApp } from "./app";
import { createContext } from "./env";

async function main() {
  dotenv.config();

  const context = await createContext();
  const { app, metrics } = buildApp(context);

  app.listen(context.config.webPort);
  metrics.listen(context.config.metricsPort);

  context.log.info(`Node public address ${context.node.address}`);
  context.log.info(`Node public endpoint ${context.node.endpoint}`);
  context.log.info(`App on :${context.config.webPort}`);
  context.log.info(`System on :${context.config.metricsPort}`);
}

await main();
