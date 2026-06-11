import 'dotenv/config';

function required(key: string): string {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required environment variable: ${key}`);
    return value;
}

function optional(key: string, fallback: string): string {
    return process.env[key] ?? fallback;
}

export const config = {
    env: optional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
    port: parseInt(optional('PORT', '4000'), 10),

    db: {
        url: required('DATABASE_URL'),
    },

    jwt: {
        accessSecret: required('JWT_ACCESS_SECRET'),
        refreshSecret: required('JWT_REFRESH_SECRET'),
        accessExpiresIn: optional('JWT_ACCESS_EXPIRES_IN', '15m'),
        refreshExpiresIn: optional('JWT_REFRESH_EXPIRES_IN', '7d'),
    },

    cors: {
        origin: optional('CORS_ORIGIN', 'https://web.timekeeping.local:2443'),
    },

    cookie: {
        domain: optional('COOKIE_DOMAIN', '.timekeeping.local'),
        secure: optional('NODE_ENV', 'development') === 'production',
    },

    rateLimit: {
        windowMs: parseInt(optional('RATE_LIMIT_WINDOW_MS', '60000'), 10),
        max: parseInt(optional('RATE_LIMIT_MAX', '100'), 10),
        authMax: parseInt(optional('AUTH_RATE_LIMIT_MAX', '10'), 10),
    },

    // 32-byte (64 hex chars) key used to encrypt Gmail App Passwords at rest
    encryption: {
        key: required('CREDENTIAL_ENCRYPTION_KEY'),
    },
} as const;
