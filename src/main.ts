import { serve } from "@hono/node-server";
import dotenv from "dotenv";
import { buildApp } from "./app";
import { loadBindings } from "./env";

async function main() {
  dotenv.config();

  console.info("! Starting api ...");

  const bindings = await loadBindings();
  const { app, metrics } = buildApp(bindings);

  serve(
    {
      fetch: app.fetch,
      port: bindings.config.webPort,
    },
    () => {
      bindings.log.info(
        `Node public address ${bindings.node.identity.address}`,
      );
      bindings.log.info(`Node public endpoint ${bindings.node.endpoint}`);
      bindings.log.info(`App on :${bindings.config.webPort}`);
    },
  );

  serve(
    {
      fetch: metrics.fetch,
      port: bindings.config.metricsPort,
    },
    () => {
      bindings.log.info(`Metrics on :${bindings.config.metricsPort}`);
    },
  );
}

await main();
