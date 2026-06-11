import { prisma } from '../config/database';
import { AppError } from '../middleware/error.middleware';
import { CreateClientInput, UpdateClientInput, ClientListQuery } from '../schemas/clients.schema';
import { PaginatedResponse, AuthenticatedUser } from '../types';
import { Client, Role } from '../generated/prisma/client';

function getClientVisibilityWhere(currentUser: AuthenticatedUser) {
    if (currentUser.role === Role.ADMIN) return {};
    return {
        OR: [{ ownerId: currentUser.id }, { isShared: true }],
    };
}

export async function listClients(query: ClientListQuery, currentUser: AuthenticatedUser): Promise<PaginatedResponse<Client>> {
    const { page, limit, search, isActive } = query;
    const skip = (page - 1) * limit;

    const where = {
        ...getClientVisibilityWhere(currentUser),
        ...(search && {
            name: { contains: search, mode: 'insensitive' as const },
        }),
        ...(isActive !== undefined && { isActive }),
    };

    const [total, data] = await Promise.all([
        prisma.client.count({ where }),
        prisma.client.findMany({
            where,
            skip,
            take: limit,
            orderBy: { name: 'asc' },
        }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
}

export async function getClientById(id: string, currentUser: AuthenticatedUser): Promise<Client> {
    const client = await prisma.client.findFirst({
        where: {
            id,
            ...getClientVisibilityWhere(currentUser),
        },
    });
    if (!client) throw new AppError(404, 'Client not found');
    return client;
}

export async function createClient(input: CreateClientInput, currentUser: AuthenticatedUser): Promise<Client> {
    return prisma.client.create({
        data: {
            ...input,
            ownerId: currentUser.id,
            isShared: false,
        },
    });
}

export async function updateClient(id: string, input: UpdateClientInput, currentUser: AuthenticatedUser): Promise<Client> {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Client not found');

    if (currentUser.role !== Role.ADMIN && existing.ownerId !== currentUser.id) {
        throw new AppError(403, 'Access denied');
    }

    if (input.isShared !== undefined && currentUser.role !== Role.ADMIN) {
        throw new AppError(403, 'Only admins can change client sharing');
    }

    return prisma.client.update({ where: { id }, data: input });
}

export async function deleteClient(id: string, currentUser: AuthenticatedUser): Promise<Client> {
    const existing = await prisma.client.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, 'Client not found');

    if (currentUser.role !== Role.ADMIN && existing.ownerId !== currentUser.id) {
        throw new AppError(403, 'Access denied');
    }

    // Soft-delete: check for active projects
    const projectCount = await prisma.project.count({ where: { clientId: id, isActive: true } });
    if (projectCount > 0) {
        throw new AppError(400, 'Cannot disable a client with active projects. Disable their projects first.');
    }
    return prisma.client.update({ where: { id }, data: { isActive: false } });
}
