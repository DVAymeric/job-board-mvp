import { PrismaClient } from "@prisma/client";

// Le pooling de connexions serverless (JOB-85) se règle au niveau des URLs
// de connexion (schema.prisma : `url` pointe vers le pooler en prod, ex.
// PgBouncer/Supavisor ; `directUrl` vers la connexion directe utilisée par
// les migrations), pas ici — PrismaClient n'a pas besoin de config
// supplémentaire pour ça. Ce singleton per-process reste nécessaire pour
// éviter d'ouvrir un nouveau pool de connexions à chaque hot-reload en dev ;
// en serverless, chaque instance/lambda a son propre process donc son
// propre singleton, ce que le pooler en amont est justement là pour gérer.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
