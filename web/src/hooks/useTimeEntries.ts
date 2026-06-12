import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { TimeEntry, WeeklyData, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface TimeEntryFilters {
    page?: number;
    limit?: number;
    userId?: string;
    projectId?: string;
    clientId?: string;
    startDate?: string;
    endDate?: string;
    isBilled?: boolean;
}

export function useTimeEntries(filters: TimeEntryFilters = {}) {
    return useQuery({
        queryKey: ['time-entries', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<TimeEntry>>('/time-entries', { params: filters });
            return data;
        },
    });
}

export function useWeeklyTimeEntries(weekStart: string, userId?: string) {
    return useQuery({
        queryKey: ['time-entries', 'weekly', weekStart, userId],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<WeeklyData>>('/time-entries/weekly', {
                params: { weekStart, ...(userId && { userId }) },
            });
            return data.data;
        },
        enabled: !!weekStart,
    });
}

export function useCreateTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: { projectId: string; date: string; hours: number; description?: string }) => {
            const { data } = await api.post<ApiResponse<TimeEntry>>('/time-entries', input);
            return data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            toast.success('Time entry saved');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to save entry');
        },
    });
}

export function useUpdateTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: { id: string; hours?: number; date?: string; description?: string; reason?: string }) => {
            const { data } = await api.patch<ApiResponse<TimeEntry>>(`/time-entries/${id}`, input);
            return data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            toast.success('Entry updated');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update entry');
        },
    });
}

export function useDeleteTimeEntry() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/time-entries/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            toast.success('Entry deleted');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to delete entry');
        },
    });
}
