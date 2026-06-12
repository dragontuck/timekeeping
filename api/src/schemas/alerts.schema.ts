import { z } from 'zod';
import { booleanFromQuery } from './common.schema';

export const createAlertSchema = z.object({
    projectId: z.string().uuid(),
    type: z.enum(['DAILY', 'WEEKLY']),
});

export const updateAlertSchema = z.object({
    isEnabled: z.boolean(),
});

export const alertListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    isEnabled: booleanFromQuery.optional(),
    type: z.enum(['DAILY', 'WEEKLY']).optional(),
});

export type CreateAlertInput = z.infer<typeof createAlertSchema>;
export type UpdateAlertInput = z.infer<typeof updateAlertSchema>;
export type AlertListQuery = z.infer<typeof alertListQuerySchema>;
