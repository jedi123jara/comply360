import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Use direct connection (port 5432) for everything including migrations
    // pgbouncer (port 6543) doesn't support DDL commands needed for migrations
    url: process.env["DIRECT_URL"]!,
  },
});
