import "dotenv/config";
import app from "./index";
import { logger } from "./lib/logger";

const port = parseInt(process.env.PORT || "3000", 10);
Bun.serve({
  fetch: app.fetch,
  port,
  hostname: "0.0.0.0",
});
logger.info(`Server listening on http://0.0.0.0:${port}`);
