import "dotenv/config";
import cors from "cors";
import express from "express";
import { apiRouter } from "./api/routes";
import { errorHandler, notFound } from "./middleware/errors";

export function createApp() {
  const app = express();
  const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
  app.use(
    cors({
      origin: frontendOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "10mb" }));
  app.use(apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
