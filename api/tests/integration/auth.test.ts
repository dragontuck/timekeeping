/**
 * Integration test for auth endpoints.
 * Requires a real (test) PostgreSQL database.
 *
 * Set DATABASE_URL in .env.test or via env before running.
 * Uses supertest to fire HTTP requests against the Express app.
 */
import request from 'supertest';
import { createApp } from '../../src/app';
import { prisma } from '../../src/config/database';
import { hashPassword } from '../../src/utils/password.util';

const app = createApp();

const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASS = 'TestPass@123';
let userId: string;

beforeAll(async () => {
    const hash = await hashPassword(TEST_PASS);
    const user = await prisma.user.create({
        data: {
            email: TEST_EMAIL,
            passwordHash: hash,
            firstName: 'Test',
            lastName: 'User',
            role: 'STANDARD',
        },
    });
    userId = user.id;
});

afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } });
    await prisma.$disconnect();
});

describe('POST /v1/auth/login', () => {
    it('returns 200 and access token on valid credentials', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: TEST_EMAIL, password: TEST_PASS });

        expect(res.status).toBe(200);
        expect(res.body.data.accessToken).toBeDefined();
        expect(res.body.data.user.email).toBe(TEST_EMAIL);
        expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: TEST_EMAIL, password: 'WrongPass@1' });

        expect(res.status).toBe(401);
    });

    it('returns 401 on unknown email', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: 'nobody@nowhere.com', password: TEST_PASS });

        expect(res.status).toBe(401);
    });

    it('returns 400 on invalid email format', async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: 'not-an-email', password: TEST_PASS });

        expect(res.status).toBe(400);
    });
});

describe('GET /v1/auth/me', () => {
    let accessToken: string;

    beforeAll(async () => {
        const res = await request(app)
            .post('/v1/auth/login')
            .send({ email: TEST_EMAIL, password: TEST_PASS });
        accessToken = res.body.data.accessToken as string;
    });

    it('returns current user with valid token', async () => {
        const res = await request(app)
            .get('/v1/auth/me')
            .set('Authorization', `Bearer ${accessToken}`);

        expect(res.status).toBe(200);
        expect(res.body.data.email).toBe(TEST_EMAIL);
    });

    it('returns 401 without token', async () => {
        const res = await request(app).get('/v1/auth/me');
        expect(res.status).toBe(401);
    });
});

describe('GET /health', () => {
    it('returns 200 ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});
