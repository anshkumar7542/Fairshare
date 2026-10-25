import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../utils/http.js";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { message: "Validation failed", details: error.flatten() } });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { message: error.message, details: error.details } });
    return;
  }

  const errObj = error as Record<string, unknown> | null;
  if (errObj?.name === "PrismaClientInitializationError" || errObj?.code === "P1001") {
    console.error("Database connection failure:", error);
    res.status(503).json({
      error: {
        message: "Database is unreachable. Please verify your DATABASE_URL in .env (if using Render, use the External Database URL for local testing)."
      }
    });
    return;
  }

  console.error(error);
  res.status(500).json({ error: { message: "Internal server error" } });
};
