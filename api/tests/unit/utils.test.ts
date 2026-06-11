import { comparePassword, hashPassword } from '../../../src/utils/password.util';
import { signAccessToken, verifyAccessToken } from '../../../src/utils/jwt.util';

describe('password utilities', () => {
    it('hashes a password and matches correctly', async () => {
        const hash = await hashPassword('MySecret@1');
        expect(hash).not.toBe('MySecret@1');
        await expect(comparePassword('MySecret@1', hash)).resolves.toBe(true);
        await expect(comparePassword('WrongPass!', hash)).resolves.toBe(false);
    });

    it('generates different hashes for the same input', async () => {
        const a = await hashPassword('Same@Pass1');
        const b = await hashPassword('Same@Pass1');
        expect(a).not.toBe(b);
    });
});

describe('JWT utilities', () => {
    beforeEach(() => {
        process.env['JWT_ACCESS_SECRET'] = 'test-access-secret-very-long-random-string-64-chars-xxxxxxxx';
        process.env['JWT_REFRESH_SECRET'] = 'test-refresh-secret-very-long-random-string-64-chars-xxxxxxx';
        process.env['JWT_ACCESS_EXPIRES_IN'] = '15m';
        process.env['JWT_REFRESH_EXPIRES_IN'] = '7d';
    });

    it('signs and verifies an access token', () => {
        const payload = { sub: 'user-123', email: 'test@example.com', role: 'STANDARD' as const };
        const token = signAccessToken(payload);
        const decoded = verifyAccessToken(token);

        expect(decoded.sub).toBe('user-123');
        expect(decoded.email).toBe('test@example.com');
        expect(decoded.role).toBe('STANDARD');
    });

    it('throws when verifying with wrong secret', () => {
        const payload = { sub: 'user-123', email: 'test@example.com', role: 'STANDARD' as const };
        const token = signAccessToken(payload);
        // Tamper with token
        const tampered = token.slice(0, -5) + 'XXXXX';
        expect(() => verifyAccessToken(tampered)).toThrow();
    });
});
