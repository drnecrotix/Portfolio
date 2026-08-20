import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function databaseUrlWithPoolLimit() {
    const raw = process.env.DATABASE_URL;
    if (!raw) return raw;

    try {
        const url = new URL(raw);
        if (!url.searchParams.has('connection_limit')) {
            url.searchParams.set('connection_limit', process.env.PRISMA_CONNECTION_LIMIT || '1');
        }
        if (!url.searchParams.has('pool_timeout')) {
            url.searchParams.set('pool_timeout', process.env.PRISMA_POOL_TIMEOUT || '20');
        }
        return url.toString();
    } catch {
        return raw;
    }
}

const pooledDatabaseUrl = databaseUrlWithPoolLimit();
if (pooledDatabaseUrl) process.env.DATABASE_URL = pooledDatabaseUrl;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

// Reuse one PrismaClient per Node.js process in every environment. This is especially
// important on shared PostgreSQL hosting where each additional client owns its own pool.
globalForPrisma.prisma = prisma;
