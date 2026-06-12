import { z } from 'zod';
import { booleanFromQuery } from './common.schema';

export const createProjectSchema = z.object({
    clientId: z.string().uuid(),
    name: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    costPerHour: z.coerce.number().positive('Cost per hour must be positive').multipleOf(0.01),
});

export const updateProjectSchema = createProjectSchema.partial().extend({
    isActive: z.boolean().optional(),
    reason: z.string().max(500).optional(),
});

export const projectListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    clientId: z.string().uuid().optional(),
    search: z.string().optional(),
    isActive: booleanFromQuery.optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
