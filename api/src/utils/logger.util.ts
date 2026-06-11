import winston from 'winston';
import { config } from '../config';

const { combine, timestamp, printf, colorize, json } = winston.format;

const devFormat = combine(
    colorize(),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    printf(({ level, message, timestamp: ts, ...meta }) => {
        const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
        return `${ts} [${level}] ${message}${metaStr}`;
    }),
);

const prodFormat = combine(
    timestamp(),
    json(),
);

export const logger = winston.createLogger({
    level: config.env === 'production' ? 'info' : 'debug',
    format: config.env === 'production' ? prodFormat : devFormat,
    transports: [
        new winston.transports.Console(),
    ],
    // Don't crash on unhandled exceptions; let process.on handle it
    exitOnError: false,
});
