import { PrismaClient } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { logger } from '../utils/logger.util';

// Singleton Prisma client – reused across hot-reloads in dev
declare global {
    // eslint-disable-next-line no-var
    var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
    const adapter = new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    });
    return new PrismaClient({
        adapter,
        log: ['query'],
    });
}

export const prisma: PrismaClient =
    global.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
    global.__prisma = prisma;
}

export async function connectDatabase(): Promise<void> {
    await prisma.$connect();
    logger.info('Connected to PostgreSQL');
}

export async function disconnectDatabase(): Promise<void> {
    await prisma.$disconnect();
    logger.info('Disconnected from PostgreSQL');
}
