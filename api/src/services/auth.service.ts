import { prisma } from '../config/database';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.util';
import { hashPassword, comparePassword } from '../utils/password.util';
import { AppError } from '../middleware/error.middleware';
import { LoginInput } from '../schemas/auth.schema';
import { logger } from '../utils/logger.util';

export async function login(input: LoginInput, ip?: string) {
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !user.isActive) {
        // Use constant-time compare to prevent user-enumeration via timing
        await comparePassword('dummy', '$2b$12$invalidhashfortimingatk');
        throw new AppError(401, 'Invalid email or password');
    }

    const isValid = await comparePassword(input.password, user.passwordHash);
    if (!isValid) {
        logger.warn('Failed login attempt', { email: input.email, ip });
        throw new AppError(401, 'Invalid email or password');
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = signAccessToken(tokenPayload);
    const refreshToken = signRefreshToken(tokenPayload);

    // Store hashed refresh token
    const hashedRefresh = await hashPassword(refreshToken);
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefresh, lastLoginAt: new Date() },
    });

    return {
        accessToken,
        refreshToken,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            invoicePrefix: user.invoicePrefix,
        },
    };
}

export async function refreshTokens(rawRefreshToken: string) {
    let payload;
    try {
        payload = verifyRefreshToken(rawRefreshToken);
    } catch {
        throw new AppError(401, 'Invalid or expired refresh token');
    }

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || !user.refreshToken) {
        throw new AppError(401, 'Invalid or expired refresh token');
    }

    const isMatch = await comparePassword(rawRefreshToken, user.refreshToken);
    if (!isMatch) {
        // Possible token reuse — invalidate all sessions
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
        throw new AppError(401, 'Refresh token reuse detected; please log in again');
    }

    const tokenPayload = { sub: user.id, email: user.email, role: user.role };
    const newAccessToken = signAccessToken(tokenPayload);
    const newRefreshToken = signRefreshToken(tokenPayload);

    const hashedRefresh = await hashPassword(newRefreshToken);
    await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: hashedRefresh },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: { refreshToken: null },
    });
}

export async function getMe(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            invoicePrefix: true,
            lastLoginAt: true,
            createdAt: true,
        },
    });
    if (!user) throw new AppError(404, 'User not found');
    return user;
}
