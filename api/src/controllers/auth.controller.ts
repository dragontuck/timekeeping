import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { config } from '../config';

const REFRESH_COOKIE = 'refreshToken';
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: 'strict' as const,
    domain: config.cookie.domain,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const result = await authService.login(req.body, req.ip);
        res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
        res.status(200).json({ data: { accessToken: result.accessToken, user: result.user } });
    } catch (err) {
        next(err);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const token = req.cookies[REFRESH_COOKIE] as string | undefined;
        if (!token) {
            res.status(401).json({ status: 'error', message: 'No refresh token' });
            return;
        }
        const result = await authService.refreshTokens(token);
        res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);
        res.status(200).json({ data: { accessToken: result.accessToken } });
    } catch (err) {
        next(err);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        if (req.user) await authService.logout(req.user.id);
        res.clearCookie(REFRESH_COOKIE, { domain: config.cookie.domain });
        res.status(200).json({ data: { message: 'Logged out' } });
    } catch (err) {
        next(err);
    }
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await authService.getMe(req.user!.id);
        res.status(200).json({ data: user });
    } catch (err) {
        next(err);
    }
}
