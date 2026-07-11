import { PrismaClient } from "@prisma/client";

// Prevents exhausting DB connections in Next.js dev hot-reload.
// At scale, pair DATABASE_URL with Vercel/Neon's pooled connection string.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
