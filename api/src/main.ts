import dotenv from "dotenv"
import Fastify from "fastify"

async function main(): Promise<void> {
  dotenv.config()

  const server = Fastify({
    logger: true,
  })

  server.get("/health", (_req, res) => {
    res.send("OK")
  })

  const port = Number(process.env.APP_PORT)
  await server.listen({ port, host: "0.0.0.0" })
}

await main()
