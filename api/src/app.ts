import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { apiRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, notFound } from './middleware/error.middleware';
import { logger } from './utils/logger.util';
import routes from './routes';

export function createApp() {
    const app = express();

    // ── Security headers ─────────────────────────────────────────────────────
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    styleSrc: ["'self'"],
                    imgSrc: ["'self'", 'data:'],
                    connectSrc: ["'self'"],
                },
            },
            crossOriginResourcePolicy: { policy: 'same-origin' },
        }),
    );

    // ── CORS ──────────────────────────────────────────────────────────────────
    app.use(
        cors({
            origin: config.cors.origin,
            credentials: true,
            methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        }),
    );

    // ── Body parsing ──────────────────────────────────────────────────────────
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());

    // ── Compression ───────────────────────────────────────────────────────────
    app.use(compression());

    // ── Request logging ───────────────────────────────────────────────────────
    app.use((req, _res, next) => {
        logger.debug(`→ ${req.method} ${req.path}`, { ip: req.ip });
        next();
    });

    // ── Trust proxy (nginx) ───────────────────────────────────────────────────
    app.set('trust proxy', 1);

    // ── Health check (no auth, no rate-limit) ────────────────────────────────
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // ── API routes ────────────────────────────────────────────────────────────
    app.use('/v1', apiRateLimiter, routes);

    // ── 404 handler ───────────────────────────────────────────────────────────
    app.use(notFound);

    // ── Global error handler ─────────────────────────────────────────────────
    app.use(errorHandler);

    return app;
}
