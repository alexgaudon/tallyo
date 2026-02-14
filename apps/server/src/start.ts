import "dotenv/config";
import { serve } from "@hono/node-server";
import app from "./index";
import { logger } from "./lib/logger";

const port = parseInt(process.env.PORT || "3000", 10);
serve(
  {
    fetch: app.fetch,
    port,
    hostname: "0.0.0.0",
  },
  (info) => {
    logger.info(`Server listening on http://${info.address}:${info.port}`);
  },
);
