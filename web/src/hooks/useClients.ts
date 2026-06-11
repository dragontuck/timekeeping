import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Client, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface ClientFilters {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
}

export function useClients(filters: ClientFilters = {}) {
    return useQuery({
        queryKey: ['clients', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Client>>('/clients', { params: filters });
            return data;
        },
    });
}

export function useClient(id: string | undefined) {
    return useQuery({
        queryKey: ['clients', id],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<Client>>(`/clients/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

export function useCreateClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: Partial<Client>) => {
            const { data } = await api.post<ApiResponse<Client>>('/clients', input);
            return data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] });
            toast.success('Client created');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to create client');
        },
    });
}

export function useUpdateClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: Partial<Client> & { id: string }) => {
            const { data } = await api.patch<ApiResponse<Client>>(`/clients/${id}`, input);
            return data.data;
        },
        onSuccess: (client) => {
            qc.invalidateQueries({ queryKey: ['clients'] });
            qc.setQueryData(['clients', client.id], client);
            toast.success('Client updated');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update client');
        },
    });
}

export function useDeleteClient() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/clients/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['clients'] });
            toast.success('Client disabled');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to disable client');
        },
    });
}
