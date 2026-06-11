import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Alert, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export function useAlerts(filters: { isEnabled?: boolean; type?: string } = {}) {
    return useQuery({
        queryKey: ['alerts', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Alert>>('/alerts', { params: filters });
            return data;
        },
    });
}

export function useCreateAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { projectId: string; type: 'DAILY' | 'WEEKLY' }) => {
            const { data } = await api.post<ApiResponse<Alert>>('/alerts', input);
            return data.data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast.success('Alert created'); },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to create alert');
        },
    });
}

export function useToggleAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, isEnabled }: { id: string; isEnabled: boolean }) => {
            const { data } = await api.patch<ApiResponse<Alert>>(`/alerts/${id}`, { isEnabled });
            return data.data;
        },
        onSuccess: (alert) => {
            qc.invalidateQueries({ queryKey: ['alerts'] });
            toast.success(alert.isEnabled ? 'Alert enabled' : 'Alert disabled');
        },
    });
}

export function useDeleteAlert() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => { await api.delete(`/alerts/${id}`); },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['alerts'] }); toast.success('Alert removed'); },
    });
}
