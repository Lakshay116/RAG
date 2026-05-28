import "dotenv/config";
import cors from "cors";
import express from "express";
import path from "path";
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

  // In production (single-service deploy), serve built frontend.
  if (process.env.NODE_ENV === "production") {
    const frontendDistPath = path.resolve(process.cwd(), "frontend", "dist");
    app.use(express.static(frontendDistPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/auth") || req.path.startsWith("/tenant") || req.path.startsWith("/health")) {
        return next();
      }
      return res.sendFile(path.join(frontendDistPath, "index.html"));
    });
  }

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
