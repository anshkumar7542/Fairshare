import { env } from "./config/env.js";
import { app } from "./app.js";

app.listen(env.PORT, () => {
  console.log(`FairShare server listening on port ${env.PORT}`);
  if (!env.DATABASE_URL) {
    console.warn("⚠️ WARNING: DATABASE_URL is not set. Please configure your PostgreSQL connection string in the environment.");
  }
});
