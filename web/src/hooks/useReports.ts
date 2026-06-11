import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { MonthlyReport, QuarterlyReport, YearlyReport, ApiResponse } from '../types';

export function useMonthlyReport(params: { year: number; month: number; clientId?: string; userId?: string } | null) {
    return useQuery({
        queryKey: ['reports', 'monthly', params],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<MonthlyReport>>('/reports/monthly', { params: params! });
            return data.data;
        },
        enabled: !!params,
    });
}

export function useQuarterlyReport(params: { year: number; quarter: number; clientId?: string } | null) {
    return useQuery({
        queryKey: ['reports', 'quarterly', params],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<QuarterlyReport>>('/reports/quarterly', { params: params! });
            return data.data;
        },
        enabled: !!params,
    });
}

export function useYearlyReport(params: { year: number; clientId?: string } | null) {
    return useQuery({
        queryKey: ['reports', 'yearly', params],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<YearlyReport>>('/reports/yearly', { params: params! });
            return data.data;
        },
        enabled: !!params,
    });
}
