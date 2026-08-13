import app from "./app";
import { logger } from "./lib/logger";

const frontendOrigin = process.env["FRONTEND_ORIGIN"];

if (!frontendOrigin) {
  throw new Error(
    "FRONTEND_ORIGIN environment variable is required but was not provided. " +
      "Set it to the URL of the frontend application (e.g. https://example.com).",
  );
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
