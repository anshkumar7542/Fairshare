import path from "node:path";
import { fileURLToPath } from "node:url";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import { env, isProduction } from "./config/env.js";
import { errorHandler } from "./middleware/error.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { balancesRouter } from "./modules/balances/balances.routes.js";
import { expensesRouter } from "./modules/expenses/expenses.routes.js";
import { groupsRouter } from "./modules/groups/groups.routes.js";
import { importsRouter } from "./modules/imports/imports.routes.js";
import { settlementsRouter } from "./modules/settlements/settlements.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const app = express();

app.set("trust proxy", 1);

const configuredOrigins = env.CLIENT_ORIGIN
  ? env.CLIENT_ORIGIN.split(",").map((o) => o.trim().replace(/\/$/, ""))
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, "");

      // Match explicit CLIENT_ORIGIN list
      if (configuredOrigins.includes(normalizedOrigin) || configuredOrigins.includes("*")) {
        return callback(null, true);
      }

      // Allow localhost in development
      if (!isProduction && /^https?:\/\/localhost(:\d+)?$/.test(origin)) {
        return callback(null, true);
      }

      // Allow onrender.com subdomains if deployed on Render
      if (/^https:\/\/[\w.-]+\.onrender\.com$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow vercel preview / production URLs
      if (/^https:\/\/[\w.-]+\.vercel\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow netlify preview / production URLs
      if (/^https:\/\/[\w.-]+\.netlify\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow any other valid origin (reflecting origin with credentials)
      return callback(null, true);
    },
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-Requested-With", "Accept"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(morgan(isProduction ? "combined" : "dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/groups", groupsRouter);
app.use("/api/imports", importsRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/settlements", settlementsRouter);
app.use("/api/balances", balancesRouter);

if (isProduction) {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.use(errorHandler);
