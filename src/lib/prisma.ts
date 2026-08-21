import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    prismaShutdownRegistered?: boolean;
    prismaShutdownInProgress?: boolean;
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

// Reuse one PrismaClient per Node.js process in every environment. Passenger may run
// multiple workers, so each worker still owns its own deliberately small connection pool.
globalForPrisma.prisma = prisma;

function registerPrismaShutdownHandlers() {
    if (globalForPrisma.prismaShutdownRegistered) return;
    globalForPrisma.prismaShutdownRegistered = true;

    const shutdown = async (signal: 'SIGTERM' | 'SIGINT') => {
        if (globalForPrisma.prismaShutdownInProgress) return;
        globalForPrisma.prismaShutdownInProgress = true;

        if (process.env.PRISMA_LIFECYCLE_LOG === '1') {
            console.info(`[prisma] disconnecting worker pid=${process.pid} signal=${signal}`);
        }

        try {
            await prisma.$disconnect();
        } catch (error) {
            console.error('[prisma] failed to disconnect cleanly', error);
        } finally {
            process.exit(signal === 'SIGINT' ? 130 : 0);
        }
    };

    process.once('SIGTERM', () => void shutdown('SIGTERM'));
    process.once('SIGINT', () => void shutdown('SIGINT'));
}

registerPrismaShutdownHandlers();
