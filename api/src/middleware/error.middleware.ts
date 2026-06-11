import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '../generated/prisma/client';
import { logger } from '../utils/logger.util';
import { config } from '../config';

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly isOperational = true,
    ) {
        super(message);
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _next: NextFunction,
): void {
    // ── Zod validation errors ────────────────────────────────────────────────
    if (err instanceof ZodError) {
        res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: err.errors.map((e) => ({
                path: e.path.join('.'),
                message: e.message,
            })),
        });
        return;
    }

    // ── Known operational errors ─────────────────────────────────────────────
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logger.error('Operational error', { message: err.message, stack: err.stack });
        }
        res.status(err.statusCode).json({
            status: 'error',
            message: err.message,
        });
        return;
    }

    // ── Prisma errors ─────────────────────────────────────────────────────────
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            res.status(409).json({ status: 'error', message: 'A record with this value already exists' });
            return;
        }
        if (err.code === 'P2025') {
            res.status(404).json({ status: 'error', message: 'Record not found' });
            return;
        }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
        res.status(400).json({ status: 'error', message: 'Invalid data provided' });
        return;
    }

    // ── Unknown / programming errors ──────────────────────────────────────────
    logger.error('Unhandled error', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
    });

    res.status(500).json({
        status: 'error',
        message: config.env === 'production' ? 'Internal server error' : err.message,
    });
}

export function notFound(req: Request, res: Response): void {
    res.status(404).json({
        status: 'error',
        message: `Route ${req.method} ${req.url} not found`,
    });
}
