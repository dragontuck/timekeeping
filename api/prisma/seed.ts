/**
 * Prisma seed – creates an initial admin user.
 * Run: npx ts-node prisma/seed.ts
 *      or: npm run prisma:seed
 *
 * ⚠️  CHANGE THE DEFAULT PASSWORD IMMEDIATELY AFTER FIRST LOGIN.
 */
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
    const email = 'admin@timekeeping.local';
    const plainPassword = 'Admin@123!';

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log(`✔ Admin user already exists: ${email}`);
        return;
    }

    const passwordHash = await bcrypt.hash(plainPassword, 12);

    await prisma.user.create({
        data: {
            email,
            passwordHash,
            firstName: 'System',
            lastName: 'Admin',
            role: 'ADMIN',
            isActive: true,
            invoicePrefix: 'INV',
        },
    });

    console.log('');
    console.log('══════════════════════════════════════════════════');
    console.log('  Database seeded successfully!');
    console.log('══════════════════════════════════════════════════');
    console.log(`  Admin email    : ${email}`);
    console.log(`  Admin password : ${plainPassword}`);
    console.log('  ⚠️  CHANGE THIS PASSWORD AFTER FIRST LOGIN');
    console.log('══════════════════════════════════════════════════');
    console.log('');
}

main()
    .catch((e) => {
        console.error('Seed failed:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
