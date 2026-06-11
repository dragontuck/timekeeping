import { z } from 'zod';

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createTimeEntrySchema = z.object({
    projectId: z.string().uuid(),
    date: isoDateString,
    hours: z.coerce
        .number()
        .positive()
        .max(24, 'Hours cannot exceed 24 per day')
        .multipleOf(0.25, 'Hours must be in quarter-hour increments'),
    description: z.string().max(1000).optional(),
});

export const updateTimeEntrySchema = createTimeEntrySchema.partial().omit({ projectId: true }).extend({
    reason: z.string().max(500).optional(),
});

export const timeEntryListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    userId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
    isBilled: z.coerce.boolean().optional(),
});

export const weeklyQuerySchema = z.object({
    weekStart: isoDateString,
    userId: z.string().uuid().optional(),
});

export type CreateTimeEntryInput = z.infer<typeof createTimeEntrySchema>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type TimeEntryListQuery = z.infer<typeof timeEntryListQuerySchema>;
export type WeeklyQuery = z.infer<typeof weeklyQuerySchema>;
