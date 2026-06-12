import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { hashPassword, comparePassword } from '../utils/password.util';
import { encrypt } from '../utils/crypto.util';
import {
    CreateUserInput,
    UpdateUserInput,
    ChangePasswordInput,
    UserListQuery,
} from '../schemas/users.schema';
import { PaginatedResponse } from '../types';
import { User } from '../generated/prisma/client';

// gmailAppPasswordEnc is NEVER returned via the API
type SafeUser = Omit<User, 'passwordHash' | 'refreshToken' | 'gmailAppPasswordEnc'>;

// Columns to select when returning user records
const safeUserSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    role: true,
    isActive: true,
    invoicePrefix: true,
    companyName: true,
    gmailUser: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
} as const;

export async function listUsers(query: UserListQuery): Promise<PaginatedResponse<SafeUser>> {
    const { page, limit, search, role, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
        ...(search && {
            OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { email: { contains: search, mode: 'insensitive' as const } },
            ],
        }),
        ...(role !== undefined && { role }),
        ...(isActive !== undefined && { isActive }),
    };

    const [total, users] = await Promise.all([
        prisma.user.count({ where }),
        prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
            select: safeUserSelect,
        }),
    ]);

    return {
        data: users as SafeUser[],
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}

export async function getUserById(id: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
        where: { id },
        select: safeUserSelect,
    });
    if (!user) throw new AppError(404, 'User not found');
    return user as SafeUser;
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new AppError(409, 'A user with this email already exists');

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
        data: {
            email: input.email,
            passwordHash,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            invoicePrefix: input.invoicePrefix ?? '',
            gmailUser: input.gmailUser ?? null,
            gmailAppPasswordEnc: input.gmailAppPassword ? encrypt(input.gmailAppPassword) : null,
        },
        select: safeUserSelect,
    });

    return user as SafeUser;
}

export async function updateUser(id: string, input: UpdateUserInput): Promise<SafeUser> {
    await getUserById(id); // throws 404 if missing

    if (input.email) {
        const existing = await prisma.user.findFirst({
            where: { email: input.email, NOT: { id } },
        });
        if (existing) throw new AppError(409, 'Email already in use');
    }

    // Extract gmailAppPassword before spreading into Prisma data
    const { gmailAppPassword, ...rest } = input;
    const data: Record<string, unknown> = { ...rest };

    // Handle Gmail App Password: encrypt if provided, clear if empty string
    if (gmailAppPassword !== undefined) {
        data['gmailAppPasswordEnc'] = gmailAppPassword === '' ? null : encrypt(gmailAppPassword);
    }
    // Remove the write-only field from the data object (not a DB column)
    delete data['gmailAppPassword'];

    const user = await prisma.user.update({
        where: { id },
        data,
        select: safeUserSelect,
    });

    return user as SafeUser;
}

export async function changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError(404, 'User not found');

    const isValid = await comparePassword(input.currentPassword, user.passwordHash);
    if (!isValid) throw new AppError(401, 'Current password is incorrect');

    const newHash = await hashPassword(input.newPassword);
    await prisma.user.update({
        where: { id },
        data: { passwordHash: newHash, refreshToken: null }, // force re-login
    });
}

export async function disableUser(id: string, requesterId: string): Promise<SafeUser> {
    if (id === requesterId) throw new AppError(400, 'You cannot disable your own account');
    return updateUser(id, { isActive: false });
}
