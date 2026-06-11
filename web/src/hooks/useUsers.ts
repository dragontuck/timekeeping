import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { User, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface UserFilters {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'ADMIN' | 'STANDARD';
    isActive?: boolean;
}

export function useUsers(filters: UserFilters = {}) {
    return useQuery({
        queryKey: ['users', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<User>>('/users', { params: filters });
            return data;
        },
    });
}

export function useCreateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            email: string;
            password: string;
            firstName: string;
            lastName: string;
            role?: 'ADMIN' | 'STANDARD';
            invoicePrefix?: string;
        }) => {
            const { data } = await api.post<ApiResponse<User>>('/users', input);
            return data.data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User created'); },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to create user');
        },
    });
}

export function useUpdateUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, ...input }: Partial<User> & { id: string }) => {
            const { data } = await api.patch<ApiResponse<User>>(`/users/${id}`, input);
            return data.data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User updated'); },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update user');
        },
    });
}

export function useDisableUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.patch<ApiResponse<User>>(`/users/${id}/disable`);
            return data.data;
        },
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('User disabled'); },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to disable user');
        },
    });
}
