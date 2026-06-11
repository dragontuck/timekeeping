import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.util';
import { AppError } from './error.middleware';
import { Role } from '../generated/prisma/client';
import { logger } from '../utils/logger.util';

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Populates req.user on success.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError(401, 'Authentication required'));
    }

    const token = authHeader.slice(7);

    try {
        const payload = verifyAccessToken(token);
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        next();
    } catch (err) {
        logger.debug('Token verification failed', { error: (err as Error).message });
        next(new AppError(401, 'Invalid or expired token'));
    }
}

/**
 * Restricts access to users with the specified role(s).
 * Must be used after `authenticate`.
 */
export function authorize(...roles: Role[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AppError(401, 'Authentication required'));
        }
        if (!roles.includes(req.user.role)) {
            return next(new AppError(403, 'Insufficient permissions'));
        }
        next();
    };
}

/**
 * Allows access only if the requester owns the resource (userId param match)
 * OR has ADMIN role.
 */
export function authorizeOwnerOrAdmin(
    req: Request,
    _res: Response,
    next: NextFunction,
): void {
    if (!req.user) {
        return next(new AppError(401, 'Authentication required'));
    }
    const targetUserId = req.params['userId'] ?? req.body?.userId;
    if (req.user.role === Role.ADMIN || req.user.id === targetUserId) {
        return next();
    }
    next(new AppError(403, 'Insufficient permissions'));
}
