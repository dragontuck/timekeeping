import jwt from 'jsonwebtoken';
import { config } from '../config';
import { JwtPayload } from '../types';

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiresIn,
        algorithm: 'HS256',
    } as jwt.SignOptions);
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
        algorithm: 'HS256',
    } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwt.refreshSecret) as JwtPayload;
}
