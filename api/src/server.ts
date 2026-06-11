import { createApp } from './app';
import { connectDatabase, disconnectDatabase } from './config/database';
import { startScheduler } from './services/scheduler.service';
import { config } from './config';
import { logger } from './utils/logger.util';

async function main(): Promise<void> {
    await connectDatabase();

    const app = createApp();

    const server = app.listen(config.port, () => {
        logger.info(`API server running on port ${config.port} [${config.env}]`);
    });

    if (config.env === 'production') {
        startScheduler();
    }

    // ── Graceful shutdown ────────────────────────────────────────────────────
    async function shutdown(signal: string): Promise<void> {
        logger.info(`Received ${signal}, shutting down gracefully...`);
        server.close(async () => {
            await disconnectDatabase();
            logger.info('Server closed');
            process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
            logger.error('Forced shutdown after timeout');
            process.exit(1);
        }, 10_000);
    }

    process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
    process.on('SIGINT', () => { void shutdown('SIGINT'); });

    process.on('unhandledRejection', (reason) => {
        logger.error('Unhandled rejection', { reason });
    });
    process.on('uncaughtException', (err) => {
        logger.error('Uncaught exception', { message: err.message, stack: err.stack });
        process.exit(1);
    });
}

main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
});
