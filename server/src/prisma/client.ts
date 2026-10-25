import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prisma = new PrismaClient(
  env.DATABASE_URL
    ? {
        datasources: {
          db: {
            url: env.DATABASE_URL
          }
        }
      }
    : undefined
);
