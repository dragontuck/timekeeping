import { useParams, Link } from 'react-router-dom';
import { useInvoice, useUpdateInvoice, useUpdateInvoiceStatus, useSendInvoice } from '../../hooks/useInvoices';
import { api } from '../../lib/api';
import { useTimeEntries } from '../../hooks/useTimeEntries';
import { useProjects } from '../../hooks/useProjects';
import Button from '../../components/ui/Button';
import Badge, { invoiceStatusBadge } from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { ConfirmModal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import type { InvoiceStatus } from '../../types';

const USD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

// Valid transitions mirrored from backend
const NEXT_ACTIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
    DRAFT: ['OPEN'],
    OPEN: ['DRAFT', 'SENT'],
    SENT: ['RESENT', 'PAID'],
    RESENT: ['PAID'],
    PAID: ['PAID_CLOSED'],
    PAID_CLOSED: [],
};

const ACTION_LABELS: Partial<Record<InvoiceStatus, string>> = {
    OPEN: 'Mark Open',
    DRAFT: 'Revert to Draft',
    PAID: 'Mark Paid',
    PAID_CLOSED: 'Close',
};

export default function InvoiceDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: invoice, isLoading } = useInvoice(id!);
    const updateMutation = useUpdateInvoice();
    const statusMutation = useUpdateInvoiceStatus();
    const sendMutation = useSendInvoice();
    const [confirmAction, setConfirmAction] = useState<InvoiceStatus | null>(null);
    const [sending, setSending] = useState(false);
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [projectId, setProjectId] = useState<string>('');
    const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);

    useEffect(() => {
        if (!invoice) return;
        setPeriodStart(invoice.periodStart.slice(0, 10));
        setPeriodEnd(invoice.periodEnd.slice(0, 10));
        setSelectedEntryIds([]);
    }, [invoice?.id, invoice?.periodStart, invoice?.periodEnd]);

    const isDraft = invoice?.status === 'DRAFT';
    const invoiceClientId = invoice?.clientId;

    const { data: projectsData } = useProjects(
        isDraft && invoiceClientId ? { clientId: invoiceClientId, isActive: true, limit: 100 } : {},
    );

    const canPreviewUnbilled = Boolean(isDraft && invoiceClientId && periodStart && periodEnd);

    const previewFilters = canPreviewUnbilled
        ? {
            clientId: invoiceClientId,
            projectId: projectId || undefined,
            startDate: periodStart,
            endDate: periodEnd,
            isBilled: false,
            limit: 100,
        }
        : {};

    const { data: unbilledPreview } = useTimeEntries(previewFilters, canPreviewUnbilled);

    const invoiceItems = invoice?.items ?? [];

    const currentEntryIds = useMemo(
        () => invoiceItems.filter((item) => item.timeEntryId).map((item) => item.timeEntryId!) as string[],
        [invoiceItems],
    );

    const projectOptions = [
        { value: '', label: 'All Projects' },
        ...(projectsData?.data ?? []).map((project) => ({ value: project.id, label: project.name })),
    ];

    const availableEntries = (unbilledPreview?.data ?? []).filter(
        (entry) => !currentEntryIds.includes(entry.id),
    );

    const selectedEntrySet = new Set(selectedEntryIds);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
    if (!invoice) return <div className="p-8 text-center text-gray-500">Invoice not found.</div>;

    const nextActions = NEXT_ACTIONS[invoice.status] ?? [];

    const toggleEntry = (entryId: string) => {
        setSelectedEntryIds((prev) => (
            prev.includes(entryId) ? prev.filter((id) => id !== entryId) : [...prev, entryId]
        ));
    };

    const handleApplyPeriod = async () => {
        await updateMutation.mutateAsync({
            id: invoice.id,
            periodStart,
            periodEnd,
            projectId: projectId || null,
            includeUnbilledInPeriod: true,
        });
        setSelectedEntryIds([]);
    };

    const handleAddSelected = async () => {
        if (selectedEntryIds.length === 0) return;
        await updateMutation.mutateAsync({
            id: invoice.id,
            periodStart,
            periodEnd,
            projectId: projectId || null,
            addTimeEntryIds: selectedEntryIds,
        });
        setSelectedEntryIds([]);
    };

    const handleRemoveEntry = async (entryId: string) => {
        await updateMutation.mutateAsync({
            id: invoice.id,
            removeTimeEntryIds: [entryId],
        });
    };

    const handleStatusChange = async () => {
        if (!confirmAction) return;
        await statusMutation.mutateAsync({ id: invoice.id, status: confirmAction });
        setConfirmAction(null);
    };

    const handleSend = async () => {
        setSending(true);
        try {
            await sendMutation.mutateAsync(invoice.id);
            toast.success('Invoice sent via email');
        } finally {
            setSending(false);
        }
    };

    const handleDownload = async () => {
        const res = await api.get(`/v1/invoices/${invoice.id}/pdf?download=true`, { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]));
        const a = document.createElement('a');
        a.href = url;
        a.download = `${invoice.invoiceNumber}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-4xl space-y-6">
            {/* Breadcrumb */}
            <div className="text-sm text-gray-500">
                <Link to="/invoices" className="hover:text-primary-600">Invoices</Link>
                <span className="mx-2">›</span>
                <span className="text-gray-900">{invoice.invoiceNumber}</span>
            </div>

            {/* Header actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-bold text-gray-900">{invoice.invoiceNumber}</h1>
                    <Badge variant={invoiceStatusBadge(invoice.status)}>{invoice.status}</Badge>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Button variant="secondary" onClick={() => void handleDownload()}>⬇ Download PDF</Button>
                    {(invoice.status === 'OPEN' || invoice.status === 'SENT') && (
                        <Button onClick={() => void handleSend()} isLoading={sending}>
                            {invoice.status === 'SENT' ? '↩ Resend' : '✉ Send'}
                        </Button>
                    )}
                    {nextActions.filter((a) => a !== 'SENT' && a !== 'RESENT').map((action) => (
                        <Button
                            key={action}
                            variant={action === 'DRAFT' ? 'secondary' : action === 'PAID' || action === 'PAID_CLOSED' ? 'primary' : 'primary'}
                            onClick={() => setConfirmAction(action)}
                        >
                            {ACTION_LABELS[action] ?? action}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Invoice detail card */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
                {/* From / Bill To */}
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">From</p>
                        <p className="font-semibold text-gray-900">
                            {invoice.user?.companyName?.trim()
                                || `${invoice.user?.firstName ?? ''} ${invoice.user?.lastName ?? ''}`.trim()
                                || 'Your Company'}
                        </p>
                        {invoice.user?.email && (
                            <p className="text-sm text-gray-500">{invoice.user.email}</p>
                        )}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Bill To</p>
                        <p className="font-semibold text-gray-900">{invoice.client.name}</p>
                        {invoice.client.email && <p className="text-sm text-gray-500">{invoice.client.email}</p>}
                    </div>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-semibold">Period</p>
                        <p className="text-gray-900 mt-0.5">
                            {format(new Date(invoice.periodStart), 'MMM d')} – {format(new Date(invoice.periodEnd), 'MMM d, yyyy')}
                        </p>
                    </div>
                    {invoice.dueDate && (
                        <div>
                            <p className="text-gray-400 text-xs uppercase font-semibold">Due Date</p>
                            <p className="text-gray-900 mt-0.5">{format(new Date(invoice.dueDate), 'MMM d, yyyy')}</p>
                        </div>
                    )}
                    <div>
                        <p className="text-gray-400 text-xs uppercase font-semibold">Created</p>
                        <p className="text-gray-900 mt-0.5">{format(new Date(invoice.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                </div>

                {isDraft && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-4">
                        <div>
                            <h3 className="text-sm font-semibold text-blue-900">Draft Builder</h3>
                            <p className="text-xs text-blue-700 mt-1">
                                Build this draft invoice by client + project and adjust the time frame anytime.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                            <Input
                                label="Period Start"
                                type="date"
                                value={periodStart}
                                onChange={(e) => setPeriodStart(e.target.value)}
                            />
                            <Input
                                label="Period End"
                                type="date"
                                value={periodEnd}
                                onChange={(e) => setPeriodEnd(e.target.value)}
                            />
                            <Select
                                label="Project"
                                options={projectOptions}
                                value={projectId}
                                onChange={(e) => setProjectId(e.target.value)}
                            />
                            <Button
                                onClick={() => void handleApplyPeriod()}
                                isLoading={updateMutation.isPending}
                                disabled={!periodStart || !periodEnd}
                            >
                                Apply Period + Refresh Draft
                            </Button>
                        </div>

                        <div className="rounded-lg border border-blue-100 bg-white p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-sm font-medium text-gray-800">Available Unbilled Time Entries</p>
                                <Button
                                    size="sm"
                                    onClick={() => void handleAddSelected()}
                                    isLoading={updateMutation.isPending}
                                    disabled={selectedEntryIds.length === 0}
                                >
                                    Add Selected ({selectedEntryIds.length})
                                </Button>
                            </div>
                            {availableEntries.length === 0 ? (
                                <p className="text-sm text-gray-500">No unbilled entries match this client/project/time range.</p>
                            ) : (
                                <div className="max-h-48 overflow-auto space-y-1">
                                    {availableEntries.map((entry) => (
                                        <label key={entry.id} className="flex items-center gap-3 text-sm p-2 rounded hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedEntrySet.has(entry.id)}
                                                onChange={() => toggleEntry(entry.id)}
                                            />
                                            <span className="text-gray-700">{format(new Date(entry.date), 'MMM d, yyyy')}</span>
                                            <span className="text-gray-500">{entry.project.name}</span>
                                            <span className="text-gray-500">{Number(entry.hours).toFixed(2)}h</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Line items */}
                <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                {['Date', 'Project', 'Description', 'Hours', 'Rate', 'Amount'].map((h) => (
                                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoice.items?.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2.5">{format(new Date(item.date), 'MMM d')}</td>
                                    <td className="px-4 py-2.5">{item.timeEntry?.project?.name ?? item.projectName ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-gray-500">{item.description ?? '—'}</td>
                                    <td className="px-4 py-2.5">{Number(item.hours).toFixed(2)}</td>
                                    <td className="px-4 py-2.5">{USD.format(Number(item.rate))}</td>
                                    <td className="px-4 py-2.5 font-medium">
                                        <div className="flex items-center justify-between gap-2">
                                            <span>{USD.format(Number(item.amount))}</span>
                                            {isDraft && item.timeEntryId && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => void handleRemoveEntry(item.timeEntryId!)}
                                                    isLoading={updateMutation.isPending}
                                                >
                                                    Remove
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                    <div className="w-64 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Subtotal</span>
                            <span className="font-medium">{USD.format(Number(invoice.subtotal))}</span>
                        </div>
                        {Number(invoice.taxRate) > 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">Tax ({Number(invoice.taxRate)}%)</span>
                                <span className="font-medium">{USD.format(Number(invoice.taxAmount))}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-bold text-lg">{USD.format(Number(invoice.total))}</span>
                        </div>
                    </div>
                </div>

                {invoice.notes && (
                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Notes</p>
                        <p className="text-sm text-gray-600">{invoice.notes}</p>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={!!confirmAction}
                onClose={() => setConfirmAction(null)}
                onConfirm={() => void handleStatusChange()}
                title="Confirm Status Change"
                message={`Change invoice status to ${confirmAction}?`}
                confirmLabel={ACTION_LABELS[confirmAction!] ?? 'Confirm'}
                isLoading={statusMutation.isPending}
            />
        </div>
    );
}
