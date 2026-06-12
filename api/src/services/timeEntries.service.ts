import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import {
    CreateTimeEntryInput,
    UpdateTimeEntryInput,
    TimeEntryListQuery,
    WeeklyQuery,
} from '../schemas/timeEntries.schema';
import { AuthenticatedUser } from '../types';
import { Role } from '../generated/prisma/client';
import { createAuditLog } from './audit.service';
import { logger } from '../utils/logger.util';

function parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year!, month! - 1, day!));
}

function addDaysUTC(date: Date, days: number): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function toUtcDateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export async function listTimeEntries(
    query: TimeEntryListQuery,
    currentUser: AuthenticatedUser,
) {
    logger.debug('timeEntriesService.listTimeEntries start', {
        userId: currentUser.id,
        role: currentUser.role,
        query,
    });

    const { page, limit, projectId, clientId, startDate, endDate, isBilled } = query;
    const skip = (page - 1) * limit;

    // Non-admin users can only see their own entries
    const targetUserId =
        currentUser.role === Role.ADMIN
            ? query.userId
            : currentUser.id;

    const where = {
        ...(targetUserId && { userId: targetUserId }),
        ...(projectId && { projectId }),
        ...(clientId && { project: { clientId } }),
        ...(isBilled !== undefined && { isBilled }),
        ...(startDate || endDate
            ? {
                date: {
                    ...(startDate && { gte: parseDate(startDate) }),
                    ...(endDate && { lte: parseDate(endDate) }),
                },
            }
            : {}),
    };
    logger.debug('timeEntriesService.listTimeEntries where', {
        userId: currentUser.id,
        role: currentUser.role,
        query,
        where,
    });

    const [total, data] = await Promise.all([
        prisma.timeEntry.count({ where }),
        prisma.timeEntry.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        costPerHour: true,
                        client: { select: { id: true, name: true } },
                    },
                },
                user: { select: { id: true, firstName: true, lastName: true } },
            },
        }),
    ]);

    logger.debug('timeEntriesService.listTimeEntries success', {
        userId: currentUser.id,
        targetUserId,
        total,
        page,
        limit,
        count: data.length,
    });

    return {
        data,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
}

export async function getWeeklyEntries(query: WeeklyQuery, currentUser: AuthenticatedUser) {
    logger.debug('timeEntriesService.getWeeklyEntries start', {
        userId: currentUser.id,
        role: currentUser.role,
        query,
    });

    const targetUserId =
        currentUser.role === Role.ADMIN && query.userId ? query.userId : currentUser.id;

    const weekStart = parseDate(query.weekStart);
    const weekEnd = addDaysUTC(weekStart, 6);

    const entries = await prisma.timeEntry.findMany({
        where: {
            userId: targetUserId,
            date: { gte: weekStart, lte: weekEnd },
        },
        orderBy: [{ date: 'asc' }],
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    client: { select: { id: true, name: true } },
                },
            },
        },
    });

    // Build 7-day grid
    const days: Record<string, typeof entries> = {};
    for (let i = 0; i < 7; i++) {
        const d = toUtcDateKey(addDaysUTC(weekStart, i));
        days[d] = [];
    }
    for (const entry of entries) {
        const key = toUtcDateKey(entry.date);
        if (days[key]) days[key]!.push(entry);
    }

    const totalHours = entries.reduce((sum, e) => sum + Number(e.hours), 0);
    const totalCost = entries.reduce(
        (sum, e) => sum + Number(e.hours) * Number(e.project.costPerHour),
        0,
    );

    logger.debug('timeEntriesService.getWeeklyEntries success', {
        userId: currentUser.id,
        targetUserId,
        weekStart: query.weekStart,
        entryCount: entries.length,
        totalHours,
        totalCost,
    });

    return { days, totalHours, totalCost, weekStart: query.weekStart };
}

export async function getTimeEntryById(id: string, currentUser: AuthenticatedUser) {
    logger.debug('timeEntriesService.getTimeEntryById start', {
        userId: currentUser.id,
        role: currentUser.role,
        entryId: id,
    });

    const entry = await prisma.timeEntry.findUnique({
        where: { id },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    client: { select: { id: true, name: true } },
                },
            },
            user: { select: { id: true, firstName: true, lastName: true } },
        },
    });

    if (!entry) {
        logger.warn('timeEntriesService.getTimeEntryById not found', {
            userId: currentUser.id,
            entryId: id,
        });
        throw new AppError(404, 'Time entry not found');
    }
    if (currentUser.role !== Role.ADMIN && entry.userId !== currentUser.id) {
        logger.warn('timeEntriesService.getTimeEntryById access denied', {
            userId: currentUser.id,
            entryId: id,
            ownerId: entry.userId,
        });
        throw new AppError(403, 'Access denied');
    }

    logger.debug('timeEntriesService.getTimeEntryById success', {
        userId: currentUser.id,
        entryId: entry.id,
    });

    return entry;
}

export async function createTimeEntry(
    input: CreateTimeEntryInput,
    currentUser: AuthenticatedUser,
) {
    logger.info('timeEntriesService.createTimeEntry start', {
        userId: currentUser.id,
        projectId: input.projectId,
        date: input.date,
        hours: input.hours,
    });

    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project || !project.isActive) {
        logger.warn('timeEntriesService.createTimeEntry invalid project', {
            userId: currentUser.id,
            projectId: input.projectId,
            projectFound: Boolean(project),
            isActive: project?.isActive,
        });
        throw new AppError(404, 'Project not found or is inactive');
    }

    const date = parseDate(input.date);

    const entry = await prisma.timeEntry.create({
        data: {
            userId: currentUser.id,
            projectId: input.projectId,
            date,
            hours: input.hours,
            description: input.description,
        },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    client: { select: { id: true, name: true } },
                },
            },
        },
    });
    await createAuditLog({
        entityType: 'TIME_ENTRY',
        entityId: entry.id,
        action: 'CREATE',
        changedById: currentUser.id,
        newData: {
            projectId: input.projectId,
            date: input.date,
            hours: input.hours,
            description: input.description ?? null,
        },
    });

    logger.info('timeEntriesService.createTimeEntry success', {
        userId: currentUser.id,
        entryId: entry.id,
        projectId: input.projectId,
    });

    return entry;
}

export async function updateTimeEntry(
    id: string,
    input: UpdateTimeEntryInput,
    currentUser: AuthenticatedUser,
) {
    logger.info('timeEntriesService.updateTimeEntry start', {
        userId: currentUser.id,
        entryId: id,
        fields: Object.keys(input ?? {}),
    });

    const entry = await getTimeEntryById(id, currentUser);

    if (entry.isBilled) {
        logger.warn('timeEntriesService.updateTimeEntry billed entry', {
            userId: currentUser.id,
            entryId: id,
        });
        throw new AppError(400, 'Cannot modify a time entry that has been billed');
    }

    const { reason, ...fields } = input;
    const data: Record<string, unknown> = {};
    if (fields.date !== undefined) data['date'] = parseDate(fields.date);
    if (fields.hours !== undefined) data['hours'] = fields.hours;
    if (fields.description !== undefined) data['description'] = fields.description;

    const updated = await prisma.timeEntry.update({
        where: { id },
        data,
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    costPerHour: true,
                    client: { select: { id: true, name: true } },
                },
            },
        },
    });
    await createAuditLog({
        entityType: 'TIME_ENTRY',
        entityId: id,
        action: 'UPDATE',
        changedById: currentUser.id,
        reason,
        previousData: {
            date: toUtcDateKey(entry.date),
            hours: String(entry.hours),
            description: entry.description ?? null,
        },
        newData: fields as Record<string, unknown>,
    });

    logger.info('timeEntriesService.updateTimeEntry success', {
        userId: currentUser.id,
        entryId: updated.id,
        updatedFields: Object.keys(data),
    });

    return updated;
}

export async function deleteTimeEntry(id: string, currentUser: AuthenticatedUser, reason?: string): Promise<void> {
    logger.info('timeEntriesService.deleteTimeEntry start', {
        userId: currentUser.id,
        entryId: id,
        hasReason: Boolean(reason),
    });

    const entry = await getTimeEntryById(id, currentUser);

    if (entry.isBilled) {
        logger.warn('timeEntriesService.deleteTimeEntry billed entry', {
            userId: currentUser.id,
            entryId: id,
        });
        throw new AppError(400, 'Cannot delete a time entry that has been billed');
    }

    await prisma.timeEntry.delete({ where: { id } });
    await createAuditLog({
        entityType: 'TIME_ENTRY',
        entityId: id,
        action: 'DELETE',
        changedById: currentUser.id,
        reason,
        previousData: {
            projectId: entry.projectId,
            date: toUtcDateKey(entry.date),
            hours: String(entry.hours),
            description: entry.description ?? null,
        },
    });

    logger.info('timeEntriesService.deleteTimeEntry success', {
        userId: currentUser.id,
        entryId: id,
    });
}
