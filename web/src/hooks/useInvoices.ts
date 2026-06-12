import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import type { Invoice, PaginatedResponse, ApiResponse } from '../types';
import toast from 'react-hot-toast';

export interface InvoiceFilters {
    page?: number;
    limit?: number;
    clientId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
}

export function useInvoices(filters: InvoiceFilters = {}) {
    return useQuery({
        queryKey: ['invoices', filters],
        queryFn: async () => {
            const { data } = await api.get<PaginatedResponse<Invoice>>('/invoices', { params: filters });
            return data;
        },
    });
}

export function useInvoice(id: string | undefined) {
    return useQuery({
        queryKey: ['invoices', id],
        queryFn: async () => {
            const { data } = await api.get<ApiResponse<Invoice>>(`/invoices/${id}`);
            return data.data;
        },
        enabled: !!id,
    });
}

export function useCreateInvoice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            clientId: string;
            projectId?: string | null;
            issueDate: string;
            dueDate: string;
            periodStart: string;
            periodEnd: string;
            timeEntryIds: string[];
            taxRate?: number;
            notes?: string;
        }) => {
            const { data } = await api.post<ApiResponse<Invoice>>('/invoices', input);
            return data.data;
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            toast.success('Invoice created');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to create invoice');
        },
    });
}

export function useUpdateInvoice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: {
            id: string;
            issueDate?: string;
            dueDate?: string;
            periodStart?: string;
            periodEnd?: string;
            projectId?: string | null;
            includeUnbilledInPeriod?: boolean;
            addTimeEntryIds?: string[];
            removeTimeEntryIds?: string[];
            taxRate?: number;
            notes?: string | null;
        }) => {
            const { id, ...body } = input;
            const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}`, body);
            return data.data;
        },
        onSuccess: (invoice) => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            qc.setQueryData(['invoices', invoice.id], invoice);
            toast.success('Draft invoice updated');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update invoice');
        },
    });
}

export function useUpdateInvoiceStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const { data } = await api.patch<ApiResponse<Invoice>>(`/invoices/${id}/status`, { status });
            return data.data;
        },
        onSuccess: (invoice) => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.setQueryData(['invoices', invoice.id], invoice);
            toast.success(`Invoice ${invoice.status.toLowerCase()}`);
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to update invoice status');
        },
    });
}

export function useSendInvoice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            const { data } = await api.post<ApiResponse<Invoice>>(`/invoices/${id}/send`);
            return data.data;
        },
        onSuccess: (invoice) => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.setQueryData(['invoices', invoice.id], invoice);
            toast.success('Invoice sent to client');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to send invoice');
        },
    });
}

export function useDeleteInvoice() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/invoices/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['invoices'] });
            qc.invalidateQueries({ queryKey: ['time-entries'] });
            toast.success('Invoice deleted');
        },
        onError: (e: { response?: { data?: { message?: string } } }) => {
            toast.error(e.response?.data?.message ?? 'Failed to delete invoice');
        },
    });
}
