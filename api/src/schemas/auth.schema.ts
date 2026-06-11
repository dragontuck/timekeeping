import { z } from 'zod';

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({});
export const logoutSchema = z.object({});

export type LoginInput = z.infer<typeof loginSchema>;
