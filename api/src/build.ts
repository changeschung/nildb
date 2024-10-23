import dotenv from "dotenv"
import { Hono } from "hono"
import { logger } from "hono/logger"

export function buildApp() {
  dotenv.config()

  const config = {
    uri: String(process.env.APP_DB_URI),
    port: Number(process.env.APP_PORT),
  }

  const app = new Hono()
  app.use(logger())

  app.get("/health", (c) => {
    return c.text("OK")
  })

  return {
    port: config.port,
    fetch: app.fetch,
  }
}
