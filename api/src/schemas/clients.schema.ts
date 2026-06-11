import { z } from 'zod';

export const createClientSchema = z.object({
    name: z.string().min(1).max(200),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().max(50).optional(),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    zip: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    notes: z.string().max(2000).optional(),
});

export const updateClientSchema = createClientSchema.partial().extend({
    isActive: z.boolean().optional(),
    isShared: z.boolean().optional(),
});

export const clientListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    search: z.string().optional(),
    isActive: z.coerce.boolean().optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientListQuery = z.infer<typeof clientListQuerySchema>;
