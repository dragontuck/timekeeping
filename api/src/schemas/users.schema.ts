import { z } from 'zod';
import { booleanFromQuery } from './common.schema';

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const createUserSchema = z.object({
    email: z.string().email(),
    password: passwordSchema,
    firstName: z.string().min(1).max(100),
    lastName: z.string().min(1).max(100),
    role: z.enum(['ADMIN', 'STANDARD']).default('STANDARD'),
    invoicePrefix: z.string().max(20).optional(),
    gmailUser: z.string().email('Must be a valid Gmail address').optional().or(z.literal('')),
    // Write-only – stored encrypted. Omit field to leave unchanged.
    gmailAppPassword: z.string().length(16, 'Gmail App Password must be 16 characters').optional(),
});

export const updateUserSchema = z.object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    email: z.string().email().optional(),
    role: z.enum(['ADMIN', 'STANDARD']).optional(),
    isActive: z.boolean().optional(),
    invoicePrefix: z.string().max(20).optional(),
    gmailUser: z.string().email('Must be a valid Gmail address').optional().or(z.literal('')),
    // Write-only – stored encrypted. Send empty string to clear.
    gmailAppPassword: z.string().optional(),
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: passwordSchema,
});

export const userListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().optional(),
    role: z.enum(['ADMIN', 'STANDARD']).optional(),
    isActive: booleanFromQuery.optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
