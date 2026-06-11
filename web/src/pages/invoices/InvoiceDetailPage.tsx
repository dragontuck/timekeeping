import { useParams, Link } from 'react-router-dom';
import { useInvoice, useUpdateInvoiceStatus, useSendInvoice } from '../../hooks/useInvoices';
import { api } from '../../lib/api';
import Button from '../../components/ui/Button';
import Badge, { invoiceStatusBadge } from '../../components/ui/Badge';
import { ConfirmModal } from '../../components/ui/Modal';
import { format } from 'date-fns';
import { useState } from 'react';
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
    const statusMutation = useUpdateInvoiceStatus();
    const sendMutation = useSendInvoice();
    const [confirmAction, setConfirmAction] = useState<InvoiceStatus | null>(null);
    const [sending, setSending] = useState(false);

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
    if (!invoice) return <div className="p-8 text-center text-gray-500">Invoice not found.</div>;

    const nextActions = NEXT_ACTIONS[invoice.status] ?? [];

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
                        <p className="font-semibold text-gray-900">Your Company</p>
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
                                    <td className="px-4 py-2.5">{'—'}</td>
                                    <td className="px-4 py-2.5 text-gray-500">{item.description ?? '—'}</td>
                                    <td className="px-4 py-2.5">{Number(item.hours).toFixed(2)}</td>
                                    <td className="px-4 py-2.5">{USD.format(Number(item.rate))}</td>
                                    <td className="px-4 py-2.5 font-medium">{USD.format(Number(item.amount))}</td>
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
