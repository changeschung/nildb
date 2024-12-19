import dotenv from "dotenv";
import { buildApp } from "./app";
import { createContext } from "./env";

async function main() {
  dotenv.config();
  console.warn("Starting api ...");

  const ctx = await createContext();
  const { app, metrics } = buildApp(ctx);

  app.listen(ctx.config.webPort);
  metrics.listen(ctx.config.metricsPort);

  ctx.log.info(`Node public address ${ctx.node.identity.address}`);
  ctx.log.info(`Node public endpoint ${ctx.node.url}`);
  ctx.log.info(`App on :${ctx.config.webPort}`);
  ctx.log.info(`System on :${ctx.config.metricsPort}`);
}

await main();
