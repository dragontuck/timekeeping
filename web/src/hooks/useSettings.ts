import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface AppSettings {
    id: string;
    sharedCompanyName: string | null;
    updatedAt: string;
}

export function useSettings() {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<AppSettings>>('/settings');
            return data.data;
        },
    });
}

export function useUpdateSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { sharedCompanyName?: string | null }) => {
            const { data } = await api.patch<ApiResponse<AppSettings>>('/settings', input);
            return data.data;
        },
        onSuccess: (settings) => {
            qc.setQueryData(['settings'], settings);
            toast.success('Settings saved');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to save settings');
        },
    });
}
