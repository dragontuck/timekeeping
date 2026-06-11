import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { AuditLog, PaginatedResponse } from '../types';

export interface AuditLogFilters {
    page?: number;
    limit?: number;
    entityType?: 'PROJECT' | 'TIME_ENTRY';
    entityId?: string;
    changedById?: string;
    startDate?: string;
    endDate?: string;
}

export function useAuditLogs(filters: AuditLogFilters = {}) {
    return useQuery({
        queryKey: ['audit-logs', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<AuditLog>>('/audit-logs', { params: filters });
            return data;
        },
    });
}
