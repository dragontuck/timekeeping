import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Project, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface ProjectFilters {
    page?: number;
    limit?: number;
    clientId?: string;
    search?: string;
    isActive?: boolean;
}

export function useProjects(filters: ProjectFilters = {}) {
    return useQuery({
        queryKey: ['projects', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Project>>('/projects', { params: filters });
            return data;
        },
    });
}

export function useProject(id: string | undefined) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

export function useCreateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { clientId: string; name: string; description?: string; costPerHour: number }) => {
            const { data } = await api.post<ApiResponse<Project>>('/projects', input);
            return data.data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project created'); },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to create project');
        },
    });
}

export function useUpdateProject() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: Partial<Project> & { id: string }) => {
            const { data } = await api.patch<ApiResponse<Project>>(`/projects/${id}`, input);
            return data.data;
        },
        onSuccess: (project) => {
            qc.invalidateQueries({ queryKey: ['projects'] });
            qc.setQueryData(['projects', project.id], project);
            toast.success('Project updated');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update project');
        },
    });
}
