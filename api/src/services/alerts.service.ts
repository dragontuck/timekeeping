import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateAlertInput, UpdateAlertInput, AlertListQuery } from '../schemas/alerts.schema';
import { AuthenticatedUser } from '../types';

export async function listAlerts(query: AlertListQuery, currentUser: AuthenticatedUser) {
    const { page, limit, isEnabled, type } = query;
    const skip = (page - 1) * limit;

    const where = {
        userId: currentUser.id,
        ...(isEnabled !== undefined && { isEnabled }),
        ...(type && { type }),
    };

    const [total, data] = await Promise.all([
        prisma.alert.count({ where }),
        prisma.alert.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                project: {
                    select: {
                        id: true,
                        name: true,
                        client: { select: { id: true, name: true } },
                    },
                },
            },
        }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function createAlert(input: CreateAlertInput, currentUser: AuthenticatedUser) {
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project || !project.isActive) {
        throw new AppError(404, 'Project not found or is inactive');
    }

    const existing = await prisma.alert.findUnique({
        where: {
            userId_projectId_type: {
                userId: currentUser.id,
                projectId: input.projectId,
                type: input.type,
            },
        },
    });
    if (existing) throw new AppError(409, 'Alert already exists for this project and type');

    return prisma.alert.create({
        data: { userId: currentUser.id, projectId: input.projectId, type: input.type },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    client: { select: { id: true, name: true } },
                },
            },
        },
    });
}

export async function updateAlert(
    id: string,
    input: UpdateAlertInput,
    currentUser: AuthenticatedUser,
) {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new AppError(404, 'Alert not found');
    if (alert.userId !== currentUser.id) throw new AppError(403, 'Access denied');

    return prisma.alert.update({
        where: { id },
        data: { isEnabled: input.isEnabled },
        include: {
            project: {
                select: {
                    id: true,
                    name: true,
                    client: { select: { id: true, name: true } },
                },
            },
        },
    });
}

export async function deleteAlert(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const alert = await prisma.alert.findUnique({ where: { id } });
    if (!alert) throw new AppError(404, 'Alert not found');
    if (alert.userId !== currentUser.id) throw new AppError(403, 'Access denied');

    await prisma.alert.delete({ where: { id } });
}
