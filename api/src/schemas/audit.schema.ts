import { z } from 'zod';

export const auditLogQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    entityType: z.enum(['PROJECT', 'TIME_ENTRY']).optional(),
    entityId: z.string().uuid().optional(),
    changedById: z.string().uuid().optional(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
