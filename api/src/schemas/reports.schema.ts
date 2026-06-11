import { z } from 'zod';

export const monthlyReportQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    month: z.coerce.number().int().min(1).max(12),
    clientId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
});

export const quarterlyReportQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    quarter: z.coerce.number().int().min(1).max(4),
    clientId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
});

export const yearlyReportQuerySchema = z.object({
    year: z.coerce.number().int().min(2000).max(2100),
    clientId: z.string().uuid().optional(),
    userId: z.string().uuid().optional(),
});

export type MonthlyReportQuery = z.infer<typeof monthlyReportQuerySchema>;
export type QuarterlyReportQuery = z.infer<typeof quarterlyReportQuerySchema>;
export type YearlyReportQuery = z.infer<typeof yearlyReportQuerySchema>;
