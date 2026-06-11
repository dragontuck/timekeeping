import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateProjectInput, UpdateProjectInput, ProjectListQuery } from '../schemas/projects.schema';
import { PaginatedResponse, AuthenticatedUser } from '../types';
import { createAuditLog } from './audit.service';

export async function listProjects(query: ProjectListQuery) {
    const { page, limit, clientId, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
        ...(clientId && { clientId }),
        ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        ...(isActive !== undefined && { isActive }),
    };

    const [total, data] = await Promise.all([
        prisma.project.count({ where }),
        prisma.project.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' },
            include: { client: { select: { id: true, name: true } } },
        }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } } as PaginatedResponse<typeof data[0]>;
}

export async function getProjectById(id: string) {
    const project = await prisma.project.findUnique({
        where: { id },
        include: { client: { select: { id: true, name: true } } },
    });
    if (!project) throw new AppError(404, 'Project not found');
    return project;
}

export async function createProject(input: CreateProjectInput, currentUser: AuthenticatedUser) {
    const client = await prisma.client.findUnique({ where: { id: input.clientId } });
    if (!client || !client.isActive) {
        throw new AppError(404, 'Client not found or is inactive');
    }
    const project = await prisma.project.create({
        data: { ...input, costPerHour: input.costPerHour },
        include: { client: { select: { id: true, name: true } } },
    });
    await createAuditLog({
        entityType: 'PROJECT',
        entityId: project.id,
        action: 'CREATE',
        changedById: currentUser.id,
        newData: { ...input } as Record<string, unknown>,
    });
    return project;
}

export async function updateProject(id: string, input: UpdateProjectInput, currentUser: AuthenticatedUser) {
    const existing = await getProjectById(id);
    const { reason, ...data } = input;
    const updated = await prisma.project.update({
        where: { id },
        data,
        include: { client: { select: { id: true, name: true } } },
    });
    await createAuditLog({
        entityType: 'PROJECT',
        entityId: id,
        action: 'UPDATE',
        changedById: currentUser.id,
        reason,
        previousData: {
            name: existing.name,
            description: existing.description,
            costPerHour: String(existing.costPerHour),
            isActive: existing.isActive,
            clientId: existing.clientId,
        },
        newData: data as Record<string, unknown>,
    });
    return updated;
}

export async function deleteProject(id: string, currentUser: AuthenticatedUser) {
    const existing = await getProjectById(id);
    const updated = await prisma.project.update({
        where: { id },
        data: { isActive: false },
    });
    await createAuditLog({
        entityType: 'PROJECT',
        entityId: id,
        action: 'DELETE',
        changedById: currentUser.id,
        previousData: {
            name: existing.name,
            isActive: existing.isActive,
        },
        newData: { isActive: false },
    });
    return updated;
}
