import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { apiV1Router } from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { apiRateLimit } from "./middleware/rateLimit.js";

export function createApp(): Express {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);
  app.use("/api/v1", apiRateLimit, apiV1Router);
  app.use(errorHandler);

  return app;
}
