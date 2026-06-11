import rateLimit from 'express-rate-limit';
import { config } from '../config';

/**
 * General API rate limiter – applied to all routes.
 */
export const apiRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many requests, please try again later.' },
});

/**
 * Stricter limiter for authentication endpoints (login, refresh).
 */
export const authRateLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many authentication attempts, please try again later.' },
    skipSuccessfulRequests: false,
});
