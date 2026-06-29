import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Use DIRECT_URL for serverless (Vercel) to avoid pgBouncer connection issues
const datasourceUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  datasourceUrl,
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
