import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
    CreateInvoiceInput,
    UpdateInvoiceInput,
    UpdateInvoiceStatusInput,
    InvoiceListQuery,
} from '../schemas/invoices.schema';
import { AuthenticatedUser } from '../types';
import { InvoiceStatus } from '../generated/prisma/client';
import { generatePdf } from './pdf.service';
import { sendInvoiceEmail } from './email.service';
import { decrypt } from '../utils/crypto.util';

function parseDate(s: string): Date {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(Date.UTC(y!, m! - 1, d!));
}

function toIsoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

async function fetchInvoiceEntriesByIds(
    entryIds: string[],
    clientId: string,
    currentUser: AuthenticatedUser,
    projectId?: string,
) {
    if (entryIds.length === 0) return [];

    const entries = await prisma.timeEntry.findMany({
        where: {
            id: { in: entryIds },
            userId: currentUser.id,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    clientId: true,
                },
            },
        },
    });

    if (entries.length !== entryIds.length) {
        throw new AppError(400, 'Some time entries were not found or do not belong to you');
    }

    const wrongClient = entries.filter((e) => e.project.clientId !== clientId);
    if (wrongClient.length > 0) {
        throw new AppError(400, 'All time entries must belong to the selected client');
    }

    if (projectId) {
        const wrongProject = entries.filter((e) => e.projectId !== projectId);
        if (wrongProject.length > 0) {
            throw new AppError(400, 'All selected entries must belong to the specified project');
        }
    }

    const billedEntries = entries.filter((e) => e.isBilled);
    if (billedEntries.length > 0) {
        throw new AppError(400, `${billedEntries.length} time entry(ies) have already been billed`);
    }

    return entries;
}

function toLineItemInput(entry: {
    id: string;
    date: Date;
    hours: unknown;
    description: string | null;
    project: { name: string; costPerHour: unknown };
}) {
    const hours = Number(entry.hours);
    const rate = Number(entry.project.costPerHour);
    return {
        timeEntryId: entry.id,
        date: entry.date,
        description: entry.description ?? `${entry.project.name}`,
        hours,
        rate,
        amount: roundCurrency(hours * rate),
    };
}

function calcTotals(lineItems: Array<{ amount: number }>, taxRate: number) {
    const subtotal = roundCurrency(lineItems.reduce((sum, item) => sum + item.amount, 0));
    const taxAmount = roundCurrency(subtotal * (taxRate / 100));
    const total = roundCurrency(subtotal + taxAmount);
    return { subtotal, taxAmount, total };
}

/** Generate next invoice number: PREFIX-YYYY-NNNN */
async function generateInvoiceNumber(userId: string, year: number): Promise<string> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { invoicePrefix: true } });
    const prefix = (user?.invoicePrefix ?? 'INV').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'INV';

    const lastInvoice = await prisma.invoice.findFirst({
        where: { userId, invoiceNumber: { startsWith: `${prefix}-${year}-` } },
        orderBy: { invoiceNumber: 'desc' },
        select: { invoiceNumber: true },
    });

    let seq = 1;
    if (lastInvoice) {
        const parts = lastInvoice.invoiceNumber.split('-');
        const lastSeq = parseInt(parts[parts.length - 1] ?? '0', 10);
        seq = lastSeq + 1;
    }

    return `${prefix}-${year}-${String(seq).padStart(4, '0')}`;
}

/** Valid status transitions */
const TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    DRAFT: ['OPEN'],
    OPEN: ['SENT', 'DRAFT'],
    SENT: ['RESENT', 'PAID'],
    RESENT: ['PAID'],
    PAID: ['PAID_CLOSED'],
    PAID_CLOSED: [],
};

export async function listInvoices(query: InvoiceListQuery, currentUser: AuthenticatedUser) {
    const { page, limit, clientId, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where = {
        userId: currentUser.id,
        ...(clientId && { clientId }),
        ...(status && { status }),
        ...(startDate || endDate
            ? {
                issueDate: {
                    ...(startDate && { gte: parseDate(startDate) }),
                    ...(endDate && { lte: parseDate(endDate) }),
                }
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.invoice.count({ where }),
        prisma.invoice.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                client: { select: { id: true, name: true, email: true } },
                _count: { select: { items: true } },
            },
        }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getInvoiceById(id: string, currentUser: AuthenticatedUser) {
    const invoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
            client: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, invoicePrefix: true, companyName: true } },
            items: {
                orderBy: { date: 'asc' },
                include: {
                    timeEntry: {
                        select: {
                            project: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });

    if (!invoice) throw new AppError(404, 'Invoice not found');
    if (invoice.userId !== currentUser.id) throw new AppError(403, 'Access denied');

    return invoice;
}

export async function createInvoice(input: CreateInvoiceInput, currentUser: AuthenticatedUser) {
    // Verify client exists
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client || !client.isActive) throw new AppError(404, 'Client not found or inactive');

    // Fetch time entries and verify ownership + unbilled status
    const entries = await prisma.timeEntry.findMany({
        where: { id: { in: input.timeEntryIds }, userId: currentUser.id },
        include: { project: { select: { id: true, name: true, costPerHour: true, clientId: true } } },
    });

    if (entries.length !== input.timeEntryIds.length) {
        throw new AppError(400, 'Some time entries were not found or do not belong to you');
    }

    const billedEntries = entries.filter((e) => e.isBilled);
    if (billedEntries.length > 0) {
        throw new AppError(400, `${billedEntries.length} time entry(ies) have already been billed`);
    }

    // Verify entries belong to the selected client
    const wrongClient = entries.filter((e) => e.project.clientId !== input.clientId);
    if (wrongClient.length > 0) {
        throw new AppError(400, 'All time entries must belong to the selected client');
    }

    if (input.projectId) {
        const wrongProject = entries.filter((e) => e.projectId !== input.projectId);
        if (wrongProject.length > 0) {
            throw new AppError(400, 'All time entries must belong to the selected project');
        }
    }

    // Calculate amounts
    const lineItems = entries.map((e) => {
        const hours = Number(e.hours);
        const rate = Number(e.project.costPerHour);
        return {
            timeEntryId: e.id,
            date: e.date,
            description: e.description ?? `${e.project.name}`,
            hours,
            rate,
            amount: Math.round(hours * rate * 100) / 100,
        };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.amount, 0);
    const taxAmount = Math.round(subtotal * (input.taxRate / 100) * 100) / 100;
    const total = subtotal + taxAmount;

    const issueYear = parseDate(input.issueDate).getUTCFullYear();
    const invoiceNumber = await generateInvoiceNumber(currentUser.id, issueYear);

    return prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.create({
            data: {
                userId: currentUser.id,
                clientId: input.clientId,
                invoiceNumber,
                issueDate: parseDate(input.issueDate),
                dueDate: parseDate(input.dueDate),
                periodStart: parseDate(input.periodStart),
                periodEnd: parseDate(input.periodEnd),
                taxRate: input.taxRate,
                subtotal,
                taxAmount,
                total,
                notes: input.notes,
                items: { create: lineItems },
            },
            include: {
                client: true,
                user: { select: { id: true, firstName: true, lastName: true, email: true, invoicePrefix: true, companyName: true } },
                items: {
                    orderBy: { date: 'asc' },
                    include: {
                        timeEntry: {
                            select: {
                                project: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        // Mark entries as billed
        await tx.timeEntry.updateMany({
            where: { id: { in: input.timeEntryIds } },
            data: { isBilled: true },
        });

        return invoice;
    });
}

export async function updateInvoice(
    id: string,
    input: UpdateInvoiceInput,
    currentUser: AuthenticatedUser,
) {
    const invoice = await getInvoiceById(id, currentUser);
    if (invoice.status !== 'DRAFT') throw new AppError(400, 'Only DRAFT invoices can be edited');

    return prisma.$transaction(async (tx) => {
        const currentLineItems = invoice.items.filter((i) => i.timeEntryId);
        const currentEntryIds = currentLineItems.map((i) => i.timeEntryId!);

        const nextTaxRate = input.taxRate !== undefined ? input.taxRate : Number(invoice.taxRate);
        const nextPeriodStart = input.periodStart ?? toIsoDate(invoice.periodStart);
        const nextPeriodEnd = input.periodEnd ?? toIsoDate(invoice.periodEnd);
        const nextProjectId = input.projectId === undefined ? undefined : input.projectId ?? null;

        const requestedAddIds = new Set<string>(input.addTimeEntryIds ?? []);
        const requestedRemoveIds = new Set<string>(input.removeTimeEntryIds ?? []);

        for (const removeId of requestedRemoveIds) {
            requestedAddIds.delete(removeId);
        }

        let replacementEntryIds: string[] | null = null;
        if (input.includeUnbilledInPeriod) {
            const matchingCurrentEntryIds = currentLineItems
                .filter((item) => {
                    const dateKey = toIsoDate(item.date);
                    if (dateKey < nextPeriodStart || dateKey > nextPeriodEnd) return false;
                    if (!nextProjectId) return true;

                    const matchingCurrent = invoice.items.find((invoiceItem) => invoiceItem.id === item.id);
                    const existingProjectId = matchingCurrent?.timeEntry?.project.id;
                    return existingProjectId === nextProjectId;
                })
                .map((item) => item.timeEntryId!);

            const periodEntries = await tx.timeEntry.findMany({
                where: {
                    userId: currentUser.id,
                    isBilled: false,
                    date: { gte: parseDate(nextPeriodStart), lte: parseDate(nextPeriodEnd) },
                    project: {
                        clientId: invoice.clientId,
                        ...(nextProjectId ? { id: nextProjectId } : {}),
                    },
                },
                select: { id: true },
            });

            replacementEntryIds = Array.from(new Set([
                ...matchingCurrentEntryIds,
                ...periodEntries.map((e) => e.id),
            ]));
        }

        let nextEntryIds = replacementEntryIds ?? [...currentEntryIds];

        if (requestedRemoveIds.size > 0) {
            nextEntryIds = nextEntryIds.filter((entryId) => !requestedRemoveIds.has(entryId));
        }

        if (requestedAddIds.size > 0) {
            const existing = new Set(nextEntryIds);
            for (const addId of requestedAddIds) {
                if (!existing.has(addId)) nextEntryIds.push(addId);
            }
        }

        const removedEntryIds = currentEntryIds.filter((entryId) => !nextEntryIds.includes(entryId));
        const addedEntryIds = nextEntryIds.filter((entryId) => !currentEntryIds.includes(entryId));

        const addedEntries = await fetchInvoiceEntriesByIds(
            addedEntryIds,
            invoice.clientId,
            currentUser,
            nextProjectId ?? undefined,
        );

        if (nextEntryIds.length === 0) {
            throw new AppError(400, 'Draft invoice must contain at least one time entry');
        }

        if (addedEntryIds.length > 0) {
            const outsidePeriod = addedEntries.filter((e) => {
                const dateKey = toIsoDate(e.date);
                return dateKey < nextPeriodStart || dateKey > nextPeriodEnd;
            });
            if (outsidePeriod.length > 0) {
                throw new AppError(400, 'Added time entries must be within the invoice period');
            }
        }

        const entryMap = new Map<string, (typeof addedEntries)[number]>();
        for (const entry of addedEntries) {
            entryMap.set(entry.id, entry);
        }

        const persistedEntries = await tx.timeEntry.findMany({
            where: {
                id: { in: currentEntryIds.filter((entryId) => nextEntryIds.includes(entryId)) },
                userId: currentUser.id,
                project: { clientId: invoice.clientId },
            },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        costPerHour: true,
                        clientId: true,
                    },
                },
            },
        });

        for (const entry of persistedEntries) {
            entryMap.set(entry.id, entry);
        }

        const nextEntries = nextEntryIds.map((entryId) => {
            const entry = entryMap.get(entryId);
            if (!entry) {
                throw new AppError(400, 'Unable to resolve one or more selected time entries');
            }
            return entry;
        });

        const invalidForClientOrProject = nextEntries.filter((entry) => {
            if (entry.project.clientId !== invoice.clientId) return true;
            if (nextProjectId && entry.projectId !== nextProjectId) return true;
            return false;
        });
        if (invalidForClientOrProject.length > 0) {
            throw new AppError(400, 'Selected time entries must match the invoice client and project filter');
        }

        const outsidePeriod = nextEntries.filter((entry) => {
            const dateKey = toIsoDate(entry.date);
            return dateKey < nextPeriodStart || dateKey > nextPeriodEnd;
        });
        if (outsidePeriod.length > 0) {
            throw new AppError(400, 'Selected time entries must be within the invoice period');
        }

        const lineItems = nextEntries.map(toLineItemInput);
        const totals = calcTotals(lineItems, nextTaxRate);

        if (removedEntryIds.length > 0) {
            await tx.timeEntry.updateMany({
                where: { id: { in: removedEntryIds } },
                data: { isBilled: false },
            });
        }

        if (addedEntryIds.length > 0) {
            await tx.timeEntry.updateMany({
                where: { id: { in: addedEntryIds } },
                data: { isBilled: true },
            });
        }

        await tx.invoiceItem.deleteMany({ where: { invoiceId: invoice.id } });
        await tx.invoiceItem.createMany({
            data: lineItems.map((item) => ({
                invoiceId: invoice.id,
                timeEntryId: item.timeEntryId,
                date: item.date,
                description: item.description,
                hours: item.hours,
                rate: item.rate,
                amount: item.amount,
            })),
        });

        const data: Record<string, unknown> = {
            periodStart: parseDate(nextPeriodStart),
            periodEnd: parseDate(nextPeriodEnd),
            taxRate: nextTaxRate,
            subtotal: totals.subtotal,
            taxAmount: totals.taxAmount,
            total: totals.total,
        };

        if (input.issueDate) data['issueDate'] = parseDate(input.issueDate);
        if (input.dueDate) data['dueDate'] = parseDate(input.dueDate);
        if (input.notes !== undefined) data['notes'] = input.notes;

        const updated = await tx.invoice.update({
            where: { id },
            data,
            include: {
                client: true,
                user: { select: { id: true, firstName: true, lastName: true, email: true, invoicePrefix: true, companyName: true } },
                items: {
                    orderBy: { date: 'asc' },
                    include: {
                        timeEntry: {
                            select: {
                                project: { select: { id: true, name: true } },
                            },
                        },
                    },
                },
            },
        });

        return updated;
    });
}

export async function updateInvoiceStatus(
    id: string,
    input: UpdateInvoiceStatusInput,
    currentUser: AuthenticatedUser,
) {
    const invoice = await getInvoiceById(id, currentUser);
    const allowed = TRANSITIONS[invoice.status] ?? [];

    if (!allowed.includes(input.status as InvoiceStatus)) {
        throw new AppError(
            400,
            `Cannot transition from ${invoice.status} to ${input.status}. Allowed: ${allowed.join(', ') || 'none'}`,
        );
    }

    const timestamps: Record<string, Date | null> = {};
    const now = new Date();
    if (input.status === 'SENT') timestamps['sentAt'] = now;
    if (input.status === 'RESENT') timestamps['resentAt'] = now;
    if (input.status === 'PAID') timestamps['paidAt'] = now;
    if (input.status === 'PAID_CLOSED') timestamps['closedAt'] = now;

    return prisma.invoice.update({
        where: { id },
        data: { status: input.status, ...timestamps },
        include: {
            client: true,
            user: { select: { id: true, firstName: true, lastName: true, email: true, invoicePrefix: true, companyName: true } },
            items: {
                orderBy: { date: 'asc' },
                include: {
                    timeEntry: {
                        select: {
                            project: { select: { id: true, name: true } },
                        },
                    },
                },
            },
        },
    });
}

export async function sendInvoice(id: string, currentUser: AuthenticatedUser) {
    const invoice = await getInvoiceById(id, currentUser);

    if (!['OPEN', 'SENT', 'RESENT'].includes(invoice.status)) {
        throw new AppError(400, `Invoice must be OPEN, SENT, or RESENT to send. Current: ${invoice.status}`);
    }

    if (!invoice.client.email) {
        throw new AppError(400, 'Client does not have an email address');
    }

    // Fetch sending user's Gmail credentials
    const userRecord = await prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { gmailUser: true, gmailAppPasswordEnc: true },
    });

    if (!userRecord?.gmailUser || !userRecord?.gmailAppPasswordEnc) {
        throw new AppError(
            400,
            'Gmail credentials are not configured on your profile. Go to Profile → Gmail Integration to add them.',
        );
    }

    const gmailAppPassword = decrypt(userRecord.gmailAppPasswordEnc);

    const pdfBuffer = await generatePdf(invoice);

    await sendInvoiceEmail(
        {
            to: invoice.client.email,
            clientName: invoice.client.name,
            invoiceNumber: invoice.invoiceNumber,
            total: Number(invoice.total),
            dueDate: invoice.dueDate.toISOString().split('T')[0]!,
            pdfBuffer,
            isResend: invoice.status === 'SENT',
        },
        { gmailUser: userRecord.gmailUser, gmailAppPassword },
    );

    const newStatus = invoice.status === 'OPEN' ? 'SENT' : 'RESENT';
    return updateInvoiceStatus(id, { status: newStatus }, currentUser);
}

export async function getInvoicePdf(id: string, currentUser: AuthenticatedUser): Promise<Buffer> {
    const invoice = await getInvoiceById(id, currentUser);
    return generatePdf(invoice);
}

export async function deleteInvoice(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const invoice = await getInvoiceById(id, currentUser);
    if (invoice.status !== 'DRAFT') {
        throw new AppError(400, 'Only DRAFT invoices can be deleted');
    }

    await prisma.$transaction(async (tx) => {
        // Un-bill the time entries
        const entryIds = invoice.items
            .filter((i) => i.timeEntryId)
            .map((i) => i.timeEntryId!);

        if (entryIds.length > 0) {
            await tx.timeEntry.updateMany({
                where: { id: { in: entryIds } },
                data: { isBilled: false },
            });
        }

        await tx.invoice.delete({ where: { id } });
    });
}
