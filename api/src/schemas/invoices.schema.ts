import { z } from 'zod';

const isoDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

export const createInvoiceSchema = z.object({
    clientId: z.string().uuid(),
    projectId: z.string().uuid().optional().nullable(),
    issueDate: isoDateString,
    dueDate: isoDateString,
    periodStart: isoDateString,
    periodEnd: isoDateString,
    timeEntryIds: z.array(z.string().uuid()).min(1, 'At least one time entry is required'),
    taxRate: z.coerce.number().min(0).max(100).default(0),
    notes: z.string().max(2000).optional(),
});

export const updateInvoiceSchema = z.object({
    issueDate: isoDateString.optional(),
    dueDate: isoDateString.optional(),
    periodStart: isoDateString.optional(),
    periodEnd: isoDateString.optional(),
    projectId: z.string().uuid().optional().nullable(),
    includeUnbilledInPeriod: z.boolean().optional(),
    addTimeEntryIds: z.array(z.string().uuid()).optional(),
    removeTimeEntryIds: z.array(z.string().uuid()).optional(),
    taxRate: z.coerce.number().min(0).max(100).optional(),
    notes: z.string().max(2000).optional().nullable(),
});

export const updateInvoiceStatusSchema = z.object({
    status: z.enum(['OPEN', 'SENT', 'RESENT', 'PAID', 'PAID_CLOSED']),
});

export const invoiceListQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    clientId: z.string().uuid().optional(),
    status: z
        .enum(['DRAFT', 'OPEN', 'SENT', 'RESENT', 'PAID', 'PAID_CLOSED'])
        .optional(),
    startDate: isoDateString.optional(),
    endDate: isoDateString.optional(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
export type InvoiceListQuery = z.infer<typeof invoiceListQuerySchema>;
