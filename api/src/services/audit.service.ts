import { prisma } from '../config/database';
import { AuditEntityType, AuditAction, Prisma } from '../generated/prisma/client';
import { AuditLogQuery } from '../schemas/audit.schema';
import { PaginatedResponse } from '../types';

export interface CreateAuditLogInput {
    entityType: AuditEntityType;
    entityId: string;
    action: AuditAction;
    changedById: string;
    reason?: string;
    previousData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
}

/**
 * Write one audit record (fire-and-forget safe – errors are swallowed so they
 * never break the originating write operation).
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                entityType: input.entityType,
                entityId: input.entityId,
                action: input.action,
                changedById: input.changedById,
                reason: input.reason ?? null,
                previousData: input.previousData !== undefined
                    ? (input.previousData as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
                newData: input.newData !== undefined
                    ? (input.newData as Prisma.InputJsonValue)
                    : Prisma.JsonNull,
            },
        });
    } catch (err) {
        // Log but never surface – audit failure must not abort business logic
        console.error('[audit] Failed to write audit log:', err);
    }
}

export async function listAuditLogs(query: AuditLogQuery): Promise<PaginatedResponse<unknown>> {
    const { page, limit, entityType, entityId, changedById, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where = {
        ...(entityType && { entityType }),
        ...(entityId && { entityId }),
        ...(changedById && { changedById }),
        ...(startDate || endDate
            ? {
                createdAt: {
                    ...(startDate && { gte: new Date(startDate) }),
                    ...(endDate && { lte: new Date(`${endDate}T23:59:59.999Z`) }),
                },
            }
            : {}),
    };

    const [total, data] = await Promise.all([
        prisma.auditLog.count({ where }),
        prisma.auditLog.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                changedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}
