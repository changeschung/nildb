import { serve } from "@hono/node-server"
import { buildApp } from "@nillion/api/build"

serve(buildApp())
